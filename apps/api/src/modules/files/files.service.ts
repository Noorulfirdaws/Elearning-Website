import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../config/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

@Injectable()
export class FilesService {
  private s3: S3Client;
  private bucket: string;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.get('app.aws.region'),
      credentials: {
        accessKeyId: this.config.get('app.aws.accessKeyId') || '',
        secretAccessKey: this.config.get('app.aws.secretAccessKey') || '',
      },
      endpoint: this.config.get('app.aws.endpoint'),
      forcePathStyle: !!this.config.get('app.aws.endpoint'),
    });
    this.bucket = this.config.get('app.aws.bucket') || 'lms-platform';
  }

  async getPresignedUploadUrl(userId: string, filename: string, mimeType: string, size: number) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`File type ${mimeType} is not allowed`);
    }
    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 500MB limit');
    }

    const ext = path.extname(filename);
    const key = `uploads/${userId}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: size,
      Metadata: { userId, originalName: filename },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    const fileUrl = `https://${this.bucket}.s3.amazonaws.com/${key}`;

    const file = await this.prisma.file.create({
      data: {
        uploadedBy: userId,
        name: `${uuidv4()}${ext}`,
        originalName: filename,
        mimeType,
        size,
        url: fileUrl,
        key,
        bucket: this.bucket,
        isPublic: false,
      },
    });

    return { uploadUrl, fileUrl, fileId: file.id, key };
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId, uploadedBy: userId } });
    if (!file) throw new BadRequestException('File not found or access denied');

    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: file.key }));
    await this.prisma.file.delete({ where: { id: fileId } });
  }

  async getPresignedDownloadUrl(key: string) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  getUserFiles(userId: string) {
    return this.prisma.file.findMany({
      where: { uploadedBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
