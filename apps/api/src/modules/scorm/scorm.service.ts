import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as AdmZip from 'adm-zip';
import * as xml2js from 'xml2js';
import * as path from 'path';
import * as fs from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export type ScormVersion = 'SCORM_12' | 'SCORM_2004';

interface ScormManifest {
  version: ScormVersion;
  title: string;
  identifier: string;
  launchUrl: string;
  masteryScore?: number;
  maxTimeAllowed?: string;
  timeLimitAction?: string;
}

@Injectable()
export class ScormService {
  private s3: S3Client;
  private bucket: string;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.get('app.aws.region'),
      credentials: {
        accessKeyId: this.config.get('app.aws.accessKeyId') || '',
        secretAccessKey: this.config.get('app.aws.secretAccessKey') || '',
      },
    });
    this.bucket = this.config.get('app.aws.bucket') || 'lms-platform';
  }

  async uploadPackage(file: Buffer, filename: string, courseId: string, instructorId: string): Promise<{ packageId: string; manifest: ScormManifest }> {
    const zip = new AdmZip(file);
    const manifestEntry = zip.getEntry('imsmanifest.xml');
    if (!manifestEntry) throw new BadRequestException('Invalid SCORM package: missing imsmanifest.xml');

    const manifestXml = manifestEntry.getData().toString('utf8');
    const manifest = await this.parseManifest(manifestXml);

    // Upload all files to S3
    const packageId = uuidv4();
    const s3Prefix = `scorm/${courseId}/${packageId}`;
    const entries = zip.getEntries();

    await Promise.all(
      entries
        .filter(e => !e.isDirectory)
        .map(async e => {
          const key = `${s3Prefix}/${e.entryName}`;
          await this.s3.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: e.getData(),
            ContentType: this.getContentType(e.entryName),
          }));
        })
    );

    await this.prisma.scormPackage.create({
      data: {
        id: packageId,
        courseId,
        uploadedBy: instructorId,
        filename,
        version: manifest.version,
        title: manifest.title,
        identifier: manifest.identifier,
        launchUrl: `${s3Prefix}/${manifest.launchUrl}`,
        masteryScore: manifest.masteryScore || 80,
        s3Prefix,
      },
    });

    return { packageId, manifest };
  }

  private async parseManifest(xml: string): Promise<ScormManifest> {
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
    const manifest = parsed.manifest;

    let version: ScormVersion = 'SCORM_12';
    const schemaVersion = manifest?.metadata?.schemaversion || '';
    if (schemaVersion.includes('2004') || schemaVersion.includes('1.3')) {
      version = 'SCORM_2004';
    }

    const org = manifest?.organizations?.organization;
    const title = org?.title || 'Untitled';
    const identifier = manifest.$?.identifier || uuidv4();

    const resources = manifest?.resources?.resource;
    const resource = Array.isArray(resources) ? resources[0] : resources;
    const launchUrl = resource?.$?.href || 'index.html';

    let masteryScore: number | undefined;
    if (version === 'SCORM_12') {
      const mastery = manifest?.organizations?.organization?.item?.adlcp_masteryscore ||
                      manifest?.organizations?.organization?.item?.['adlcp:masteryscore'];
      if (mastery) masteryScore = parseInt(mastery, 10);
    }

    return { version, title, identifier, launchUrl, masteryScore };
  }

  async getPackage(packageId: string) {
    const pkg = await this.prisma.scormPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('SCORM package not found');
    return pkg;
  }

  async getLaunchUrl(packageId: string): Promise<string> {
    const pkg = await this.getPackage(packageId);
    return `https://${this.bucket}.s3.amazonaws.com/${pkg.launchUrl}`;
  }

  // SCORM 1.2 Runtime data persistence
  async saveScorm12Data(packageId: string, userId: string, data: Record<string, string>) {
    const session = await this.prisma.scormSession.upsert({
      where: { packageId_userId: { packageId, userId } },
      create: { packageId, userId, data: data as any, version: 'SCORM_12' },
      update: { data: data as any, updatedAt: new Date() },
    });

    // Check completion
    const lessonStatus = data['cmi.core.lesson_status'];
    const masteryScore = (await this.getPackage(packageId)).masteryScore || 80;
    const score = parseFloat(data['cmi.core.score.raw'] || '0');

    if (['passed', 'completed', 'failed'].includes(lessonStatus)) {
      const passed = lessonStatus === 'passed' || (lessonStatus === 'completed' && score >= masteryScore);
      await this.prisma.scormSession.update({
        where: { id: session.id },
        data: { completionStatus: lessonStatus, score, passed },
      });
    }

    return session;
  }

  // SCORM 2004 Runtime data persistence
  async saveScorm2004Data(packageId: string, userId: string, data: Record<string, string>) {
    const session = await this.prisma.scormSession.upsert({
      where: { packageId_userId: { packageId, userId } },
      create: { packageId, userId, data: data as any, version: 'SCORM_2004' },
      update: { data: data as any, updatedAt: new Date() },
    });

    const completionStatus = data['cmi.completion_status'];
    const successStatus = data['cmi.success_status'];
    const score = parseFloat(data['cmi.score.scaled'] || '0') * 100;

    if (completionStatus === 'completed') {
      await this.prisma.scormSession.update({
        where: { id: session.id },
        data: { completionStatus, score, passed: successStatus === 'passed' },
      });
    }

    return session;
  }

  async getScormData(packageId: string, userId: string) {
    const session = await this.prisma.scormSession.findUnique({
      where: { packageId_userId: { packageId, userId } },
    });
    return session?.data || {};
  }

  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const map: Record<string, string> = {
      '.html': 'text/html', '.htm': 'text/html', '.js': 'application/javascript',
      '.css': 'text/css', '.xml': 'application/xml', '.json': 'application/json',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
      '.swf': 'application/x-shockwave-flash', '.pdf': 'application/pdf',
    };
    return map[ext] || 'application/octet-stream';
  }
}
