import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class WebinarService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async create(instructorId: string, dto: {
    title: string;
    description?: string;
    scheduledAt: Date;
    durationMinutes: number;
    maxAttendees?: number;
    courseId?: string;
    isRecorded?: boolean;
    password?: string;
    tenantId?: string;
  }) {
    const roomId = `lms-${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    return this.prisma.webinar.create({
      data: {
        id: uuidv4(),
        instructorId,
        courseId: dto.courseId,
        tenantId: dto.tenantId,
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt,
        durationMinutes: dto.durationMinutes,
        maxAttendees: dto.maxAttendees || 500,
        roomId,
        isRecorded: dto.isRecorded ?? true,
        password: dto.password,
        status: 'SCHEDULED',
      },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async getJoinToken(webinarId: string, userId: string, role: 'host' | 'participant'): Promise<{
    token: string; roomUrl: string; provider: string;
  }> {
    const webinar = await this.prisma.webinar.findUnique({ where: { id: webinarId } });
    if (!webinar) throw new NotFoundException('Webinar not found');
    if (webinar.status === 'ENDED') throw new BadRequestException('Webinar has ended');

    const provider = this.config.get('app.webinar.provider') || 'livekit';

    if (provider === 'livekit') {
      return this.getLiveKitToken(webinar, userId, role);
    } else if (provider === 'daily') {
      return this.getDailyToken(webinar, userId, role);
    } else if (provider === 'zoom') {
      return this.getZoomToken(webinar, userId, role);
    }

    throw new BadRequestException('No webinar provider configured');
  }

  private async getLiveKitToken(webinar: any, userId: string, role: string): Promise<any> {
    const { AccessToken } = await import('livekit-server-sdk');
    const apiKey = this.config.get('app.livekit.apiKey');
    const apiSecret = this.config.get('app.livekit.apiSecret');
    const wsUrl = this.config.get('app.livekit.wsUrl');

    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      ttl: '4h',
    });

    token.addGrant({
      roomJoin: true,
      room: webinar.roomId,
      canPublish: role === 'host',
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      token: await token.toJwt(),
      roomUrl: wsUrl,
      provider: 'livekit',
    };
  }

  private async getDailyToken(webinar: any, userId: string, role: string): Promise<any> {
    const apiKey = this.config.get('app.daily.apiKey');

    // Create room if needed
    const roomRes = await fetch(`https://api.daily.co/v1/rooms/${webinar.roomId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (roomRes.status === 404) {
      await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: webinar.roomId,
          privacy: webinar.password ? 'private' : 'public',
          properties: {
            max_participants: webinar.maxAttendees,
            enable_recording: webinar.isRecorded ? 'cloud' : 'off',
            exp: Math.floor(new Date(webinar.scheduledAt).getTime() / 1000) + webinar.durationMinutes * 60 + 3600,
          },
        }),
      });
    }

    // Create meeting token
    const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: {
          room_name: webinar.roomId,
          is_owner: role === 'host',
          user_id: userId,
          exp: Math.floor(Date.now() / 1000) + 4 * 3600,
        },
      }),
    });

    const tokenData = await tokenRes.json();
    return {
      token: tokenData.token,
      roomUrl: `https://yourdomain.daily.co/${webinar.roomId}`,
      provider: 'daily',
    };
  }

  private async getZoomToken(webinar: any, userId: string, role: string): Promise<any> {
    const sdkKey = this.config.get('app.zoom.sdkKey');
    const sdkSecret = this.config.get('app.zoom.sdkSecret');
    const mn = webinar.zoomMeetingNumber;

    const payload = {
      sdkKey,
      mn,
      role: role === 'host' ? 1 : 0,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 4 * 3600,
      appKey: sdkKey,
      tokenExp: Math.floor(Date.now() / 1000) + 4 * 3600,
    };

    const token = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });
    return { token, roomUrl: `https://zoom.us/j/${mn}`, provider: 'zoom' };
  }

  async start(webinarId: string, instructorId: string) {
    const webinar = await this.prisma.webinar.findUnique({ where: { id: webinarId } });
    if (!webinar) throw new NotFoundException('Webinar not found');
    if (webinar.instructorId !== instructorId) throw new BadRequestException('Not your webinar');

    return this.prisma.webinar.update({
      where: { id: webinarId },
      data: { status: 'LIVE', startedAt: new Date() },
    });
  }

  async end(webinarId: string, instructorId: string) {
    const webinar = await this.prisma.webinar.findUnique({ where: { id: webinarId } });
    if (!webinar) throw new NotFoundException('Webinar not found');
    if (webinar.instructorId !== instructorId) throw new BadRequestException('Not your webinar');

    return this.prisma.webinar.update({
      where: { id: webinarId },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  }

  async register(webinarId: string, userId: string) {
    return this.prisma.webinarRegistration.upsert({
      where: { webinarId_userId: { webinarId, userId } },
      create: { webinarId, userId },
      update: {},
    });
  }

  async getUpcoming(tenantId?: string) {
    return this.prisma.webinar.findMany({
      where: {
        status: { in: ['SCHEDULED', 'LIVE'] },
        scheduledAt: { gte: new Date() },
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });
  }

  async getRecordings(webinarId: string) {
    const webinar = await this.prisma.webinar.findUnique({ where: { id: webinarId } });
    if (!webinar) throw new NotFoundException('Webinar not found');
    return this.prisma.webinarRecording.findMany({ where: { webinarId }, orderBy: { createdAt: 'desc' } });
  }
}
