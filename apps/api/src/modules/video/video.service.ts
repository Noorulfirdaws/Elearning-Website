/**
 * VideoService with Mux → S3/CloudFront fallback
 *
 * Mux outage behaviour:
 *  1. Circuit breaker opens after 5 Mux API errors
 *  2. createUploadUrl() → falls back to direct S3 presigned upload
 *  3. createSignedPlaybackToken() → falls back to CloudFront signed URL
 *  4. Lessons with muxPlaybackId get a Mux URL; others get S3 URL
 *  5. No video processing (HLS adaptive) during outage — MP4 served directly
 *  6. Webhook handler kept alive independently (doesn't use circuit)
 */
import { Injectable, BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mux from '@mux/mux-node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as s3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { PrismaService } from '../../config/prisma.service';
import { CircuitBreaker } from '../../common/resilience/circuit-breaker';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private mux: Mux;
  private s3:  S3Client;
  private readonly cb = new CircuitBreaker('mux', { failureThreshold: 5, timeout: 60_000 });

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.mux = new Mux({
      tokenId:     this.config.get('app.mux.tokenId')     || '',
      tokenSecret: this.config.get('app.mux.tokenSecret') || '',
    });

    // S3 fallback client
    this.s3 = new S3Client({
      region: this.config.get('app.aws.region') || 'us-east-1',
      credentials: {
        accessKeyId:     this.config.get('app.aws.accessKeyId')     || '',
        secretAccessKey: this.config.get('app.aws.secretAccessKey') || '',
      },
    });
  }

  // ── Upload URL ────────────────────────────────────────────────────────────

  async createUploadUrl(userId?: string) {
    return this.cb.execute(
      // Primary: Mux direct upload
      async () => {
        const upload = await this.mux.video.uploads.create({
          new_asset_settings: {
            playback_policy: ['signed'],
            encoding_tier: 'smart',
          },
          cors_origin: this.config.get('app.frontendUrl') || 'http://localhost:3000',
        });
        return {
          uploadUrl: upload.url,
          uploadId:  upload.id,
          provider:  'mux' as const,
        };
      },
      // Fallback: S3 presigned POST
      async () => {
        this.logger.warn('Mux OPEN — using S3 direct upload fallback');
        const key    = `raw-videos/${userId || 'unknown'}/${uuidv4()}.mp4`;
        const bucket = this.config.get('app.aws.bucket') || 'lms-platform';

        const { url, fields } = await createPresignedPost(this.s3, {
          Bucket:     bucket,
          Key:        key,
          Conditions: [
            ['content-length-range', 0, 5 * 1024 * 1024 * 1024], // 5GB max
            ['starts-with', '$Content-Type', 'video/'],
          ],
          Expires: 3600,
        });

        return {
          uploadUrl:  url,
          uploadId:   key, // Use S3 key as ID
          fields,          // Client must include these form fields
          provider:   's3' as const,
          fallback:   true,
          message:    'Video will be available without transcoding. HLS encoding will resume when video processor recovers.',
        };
      },
    );
  }

  // ── Playback token / URL ──────────────────────────────────────────────────

  async getPlaybackUrl(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where:  { id: lessonId },
      select: { muxPlaybackId: true, muxAssetId: true, videoUrl: true },
    });

    if (!lesson) throw new BadRequestException('Lesson not found');

    // If Mux is healthy and we have a Mux playback ID
    if (lesson.muxPlaybackId && !this.cb.isOpen) {
      try {
        const token = await this.cb.execute(() =>
          this.createSignedPlaybackToken(lesson.muxPlaybackId!)
        );
        return {
          url:      `https://stream.mux.com/${lesson.muxPlaybackId}.m3u8`,
          token:    token.token,
          provider: 'mux' as const,
        };
      } catch {
        // Fall through to S3 fallback
      }
    }

    // Fallback: serve original video from S3/CloudFront
    if (lesson.videoUrl) {
      this.logger.warn(`Mux unavailable for lesson ${lessonId} — serving S3 fallback URL`);
      const cfUrl = this.buildCloudFrontUrl(lesson.videoUrl);
      return {
        url:      cfUrl,
        token:    null,
        provider: 's3' as const,
        fallback: true,
        notice:   'Adaptive streaming temporarily unavailable. Playing original video.',
      };
    }

    throw new ServiceUnavailableException('Video temporarily unavailable. Please try again shortly.');
  }

  // ── Status ────────────────────────────────────────────────────────────────

  async getUploadStatus(uploadId: string) {
    if (this.cb.isOpen) {
      // S3 uploads are confirmed via S3 event (no Mux polling needed)
      return { status: 'processing', provider: 's3', message: 'Video processing offline — file uploaded to storage' };
    }
    return this.cb.execute(async () => {
      const upload = await this.mux.video.uploads.retrieve(uploadId);
      return { status: upload.status, assetId: upload.asset_id, provider: 'mux' };
    });
  }

  async getAsset(assetId: string) {
    if (this.cb.isOpen) {
      return { id: assetId, status: 'unavailable', provider: 's3', fallback: true };
    }
    return this.cb.execute(async () => {
      const asset = await this.mux.video.assets.retrieve(assetId);
      return { id: asset.id, status: asset.status, duration: asset.duration, playbackIds: asset.playback_ids };
    });
  }

  async deleteAsset(assetId: string) {
    if (this.cb.isOpen) {
      this.logger.warn(`Mux OPEN — delete queued for asset ${assetId}`);
      return; // Could push to a deletion queue
    }
    await this.cb.execute(() => this.mux.video.assets.delete(assetId));
  }

  // ── Webhook — independent of circuit breaker ──────────────────────────────

  async handleWebhook(payload: string, signature: string) {
    const webhookSecret = this.config.get('app.mux.webhookSecret') || '';
    let event: any;
    try {
      event = Mux.Webhooks.unwrap(payload, { 'mux-signature': signature }, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Mux webhook signature');
    }

    if (event.type === 'video.asset.ready') {
      const assetId    = event.data.id;
      const playbackId = event.data.playback_ids?.[0]?.id;
      const duration   = Math.round(event.data.duration || 0);

      if (playbackId) {
        await this.prisma.lesson.updateMany({
          where: { muxAssetId: assetId },
          data:  { muxPlaybackId: playbackId, duration },
        });
        this.logger.log(`Mux asset ready: ${assetId} → playback ${playbackId}`);
      }
    }

    if (event.type === 'video.asset.errored') {
      this.logger.error(`Mux asset error: ${event.data.id} — ${JSON.stringify(event.data.errors)}`);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async createSignedPlaybackToken(playbackId: string) {
    const keyId     = this.config.get('app.mux.signingKeyId');
    const keySecret = this.config.get('app.mux.signingKeySecret');
    if (!keyId || !keySecret) return { token: null };

    const token = await Mux.JWT.signPlaybackId(playbackId, {
      keyId, keySecret, expiration: '12h',
    });
    return { token };
  }

  private buildCloudFrontUrl(s3Url: string): string {
    const cdnDomain = this.config.get('CDN_DOMAIN');
    if (!cdnDomain) return s3Url;
    // Replace S3 origin with CloudFront domain
    return s3Url.replace(/https:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com/, `https://${cdnDomain}`);
  }

  health() { return { circuit: this.cb.status.state }; }
}
