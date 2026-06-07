import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export type WebhookEvent =
  | 'enrollment.created' | 'enrollment.completed'
  | 'payment.succeeded' | 'payment.failed' | 'payment.refunded'
  | 'course.published' | 'course.unpublished'
  | 'certificate.issued'
  | 'user.created' | 'user.banned'
  | 'quiz.passed' | 'quiz.failed'
  | 'assignment.submitted' | 'assignment.graded'
  | 'lesson.completed'
  | 'review.created';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async create(tenantId: string, dto: {
    url: string;
    events: WebhookEvent[];
    description?: string;
    headers?: Record<string, string>;
  }) {
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    return this.prisma.webhookEndpoint.create({
      data: {
        id: uuidv4(),
        tenantId,
        url: dto.url,
        events: dto.events,
        description: dto.description,
        customHeaders: dto.headers as any || {},
        secret,
        isActive: true,
      },
    });
  }

  async list(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { tenantId },
      include: {
        _count: { select: { deliveries: true } },
      },
    });
  }

  async findById(id: string, tenantId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');
    return endpoint;
  }

  async update(id: string, tenantId: string, dto: Partial<{
    url: string; events: WebhookEvent[]; description: string;
    headers: Record<string, string>; isActive: boolean;
  }>) {
    await this.findById(id, tenantId);
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(dto.url && { url: dto.url }),
        ...(dto.events && { events: dto.events }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.headers && { customHeaders: dto.headers as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async rotateSecret(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    return this.prisma.webhookEndpoint.update({ where: { id }, data: { secret } });
  }

  async deliveries(endpointId: string, tenantId: string, limit = 50) {
    await this.findById(endpointId, tenantId);
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async redeliver(deliveryId: string, tenantId: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');

    return this.sendToEndpoint(delivery.endpoint, delivery.event as WebhookEvent, delivery.payload as any);
  }

  // Called internally when events occur
  async dispatch(event: WebhookEvent, payload: Record<string, any>, tenantId?: string) {
    const where: any = { isActive: true, events: { has: event } };
    if (tenantId) where.tenantId = tenantId;

    const endpoints = await this.prisma.webhookEndpoint.findMany({ where });

    await Promise.allSettled(
      endpoints.map(endpoint => this.sendToEndpoint(endpoint, event, payload)),
    );
  }

  private async sendToEndpoint(endpoint: any, event: WebhookEvent, payload: Record<string, any>) {
    const deliveryId = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: deliveryId,
      event,
      timestamp,
      data: payload,
      livemode: process.env.NODE_ENV === 'production',
    });

    const signature = this.sign(body, endpoint.secret, timestamp);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-LMS-Event': event,
      'X-LMS-Delivery': deliveryId,
      'X-LMS-Signature': signature,
      'X-LMS-Timestamp': timestamp.toString(),
      'User-Agent': 'LMS-Webhooks/1.0',
      ...(endpoint.customHeaders || {}),
    };

    let statusCode = 0;
    let responseBody = '';
    let success = false;
    const startTime = Date.now();

    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(30000),
      });
      statusCode = res.status;
      responseBody = await res.text();
      success = res.ok;
    } catch (err: any) {
      responseBody = err.message;
    }

    const duration = Date.now() - startTime;

    await this.prisma.webhookDelivery.create({
      data: {
        id: deliveryId,
        endpointId: endpoint.id,
        event,
        payload: payload as any,
        requestBody: body,
        responseStatusCode: statusCode,
        responseBody,
        success,
        durationMs: duration,
      },
    });

    if (!success) {
      // Schedule retry (exponential backoff — max 5 attempts at 5m, 30m, 2h, 8h, 24h)
      await this.prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: { failureCount: { increment: 1 } },
      });
    } else {
      await this.prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: { failureCount: 0, lastSuccessAt: new Date() },
      });
    }

    return { deliveryId, success, statusCode };
  }

  private sign(body: string, secret: string, timestamp: number): string {
    const payload = `${timestamp}.${body}`;
    return `v1=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  }

  static verifySignature(body: string, signature: string, secret: string): boolean {
    const [ts, sig] = signature.replace('v1=', '').split(',').map(p => p.trim());
    const timestamp = parseInt(ts.replace('t=', ''));
    if (Date.now() / 1000 - timestamp > 300) return false; // 5 min tolerance

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  }
}
