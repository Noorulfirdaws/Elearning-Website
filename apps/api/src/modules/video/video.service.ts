import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mux from '@mux/mux-node';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class VideoService {
  private mux: Mux;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.mux = new Mux({
      tokenId: this.config.get('app.mux.tokenId') || '',
      tokenSecret: this.config.get('app.mux.tokenSecret') || '',
    });
  }

  async createUploadUrl() {
    const upload = await this.mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['signed'],
        encoding_tier: 'smart',
      },
      cors_origin: this.config.get('app.frontendUrl') || 'http://localhost:3000',
    });
    return { uploadUrl: upload.url, uploadId: upload.id };
  }

  async getUploadStatus(uploadId: string) {
    const upload = await this.mux.video.uploads.retrieve(uploadId);
    return { status: upload.status, assetId: upload.asset_id };
  }

  async getAsset(assetId: string) {
    const asset = await this.mux.video.assets.retrieve(assetId);
    return {
      id: asset.id,
      status: asset.status,
      duration: asset.duration,
      playbackIds: asset.playback_ids,
    };
  }

  async deleteAsset(assetId: string) {
    await this.mux.video.assets.delete(assetId);
  }

  async handleWebhook(payload: string, signature: string) {
    const webhookSecret = this.config.get('app.mux.webhookSecret') || '';
    let event: any;
    try {
      event = Mux.Webhooks.unwrap(payload, { 'mux-signature': signature }, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Mux webhook signature');
    }

    if (event.type === 'video.asset.ready') {
      const assetId = event.data.id;
      const playbackId = event.data.playback_ids?.[0]?.id;
      const duration = Math.round(event.data.duration || 0);

      if (playbackId) {
        await this.prisma.lesson.updateMany({
          where: { muxAssetId: assetId },
          data: { muxPlaybackId: playbackId, duration },
        });
      }
    }
  }

  async createSignedPlaybackToken(playbackId: string) {
    const keyId = this.config.get('app.mux.signingKeyId');
    const keySecret = this.config.get('app.mux.signingKeySecret');
    if (!keyId || !keySecret) return { token: null };

    const token = await Mux.JWT.signPlaybackId(playbackId, {
      keyId,
      keySecret,
      expiration: '12h',
    });
    return { token };
  }
}
