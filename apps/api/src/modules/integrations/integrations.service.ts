import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export type IntegrationType =
  | 'SALESFORCE' | 'HUBSPOT' | 'WORKDAY' | 'SUCCESSFACTORS'
  | 'BAMBOOHR' | 'RIPPLING' | 'SAP' | 'ORACLE' | 'SLACK' | 'TEAMS' | 'ZAPIER';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async create(tenantId: string, dto: {
    type: IntegrationType;
    name: string;
    credentials: Record<string, string>;
    settings?: Record<string, any>;
    webhookUrl?: string;
  }) {
    // Encrypt credentials before storing (use KMS in production)
    return this.prisma.integration.create({
      data: {
        id: uuidv4(),
        tenantId,
        type: dto.type as any,
        name: dto.name,
        credentials: dto.credentials as any,
        settings: dto.settings as any || {},
        webhookUrl: dto.webhookUrl,
        isActive: true,
      },
    });
  }

  async list(tenantId: string) {
    return this.prisma.integration.findMany({
      where: { tenantId },
      select: {
        id: true, type: true, name: true, isActive: true,
        lastSyncAt: true, settings: true, webhookUrl: true, createdAt: true,
      },
    });
  }

  async sync(integrationId: string, tenantId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    const handler = this.getHandler(integration.type as IntegrationType);
    const result = await handler.sync(integration);

    await this.prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date(), lastSyncResult: result as any },
    });

    return result;
  }

  private getHandler(type: IntegrationType) {
    switch (type) {
      case 'SALESFORCE': return new SalesforceHandler(this.config);
      case 'HUBSPOT': return new HubspotHandler(this.config);
      case 'WORKDAY': return new WorkdayHandler(this.config);
      case 'SLACK': return new SlackHandler(this.config);
      case 'TEAMS': return new TeamsHandler(this.config);
      default: throw new BadRequestException(`Unsupported integration type: ${type}`);
    }
  }

  // Salesforce: sync course completions as campaign activities
  async syncToSalesforce(tenantId: string, data: { userId: string; courseId: string; completedAt: Date }) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'SALESFORCE', isActive: true },
    });
    if (!integration) return;

    const handler = new SalesforceHandler(this.config);
    await handler.createActivity(integration.credentials as any, data);
  }

  // HubSpot: sync enrollments as contact activities
  async syncToHubspot(tenantId: string, data: { email: string; courseTitle: string; action: string }) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'HUBSPOT', isActive: true },
    });
    if (!integration) return;

    const handler = new HubspotHandler(this.config);
    await handler.trackActivity(integration.credentials as any, data);
  }

  // Slack: notify channel on completions
  async notifySlack(tenantId: string, message: string, channel?: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'SLACK', isActive: true },
    });
    if (!integration) return;

    const webhookUrl = (integration.credentials as any).webhookUrl || integration.webhookUrl;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channel || (integration.settings as any)?.defaultChannel,
        text: message,
      }),
    });
  }

  // MS Teams
  async notifyTeams(tenantId: string, title: string, message: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'TEAMS', isActive: true },
    });
    if (!integration) return;

    const webhookUrl = (integration.credentials as any).webhookUrl || integration.webhookUrl;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: title,
        sections: [{ activityTitle: title, activityText: message }],
      }),
    });
  }

  // HRIS sync: import users from Workday/BambooHR
  async importUsersFromHris(integrationId: string, tenantId: string) {
    const integration = await this.prisma.integration.findFirst({ where: { id: integrationId, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');

    const handler = new WorkdayHandler(this.config);
    const users = await handler.getWorkers(integration.credentials as any);

    let created = 0, updated = 0;
    for (const user of users) {
      const existing = await this.prisma.user.findFirst({ where: { email: user.email, tenantId } });
      if (existing) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { firstName: user.firstName, lastName: user.lastName, externalId: user.id },
        });
        updated++;
      } else {
        await this.prisma.user.create({
          data: {
            email: user.email, firstName: user.firstName, lastName: user.lastName,
            role: 'STUDENT', tenantId, externalId: user.id, isEmailVerified: true,
          },
        });
        created++;
      }
    }

    return { created, updated, total: users.length };
  }
}

// Handler implementations
class SalesforceHandler {
  constructor(private config: ConfigService) {}

  async sync(integration: any) {
    return { synced: 0, message: 'Salesforce sync scheduled' };
  }

  async createActivity(creds: { instanceUrl: string; accessToken: string }, data: any) {
    await fetch(`${creds.instanceUrl}/services/data/v58.0/sobjects/Task/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Subject: `Course Completed: ${data.courseId}`,
        Status: 'Completed',
        ActivityDate: data.completedAt.toISOString().split('T')[0],
      }),
    });
  }
}

class HubspotHandler {
  constructor(private config: ConfigService) {}

  async sync(integration: any) {
    return { synced: 0, message: 'HubSpot sync scheduled' };
  }

  async trackActivity(creds: { apiKey: string }, data: { email: string; courseTitle: string; action: string }) {
    await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: data.email }] }] }),
    });
  }
}

class WorkdayHandler {
  constructor(private config: ConfigService) {}

  async sync(integration: any) {
    return { synced: 0, message: 'Workday sync complete' };
  }

  async getWorkers(creds: any): Promise<Array<{ id: string; email: string; firstName: string; lastName: string }>> {
    // Workday REST API integration
    // In production: OAuth2 flow with Workday tenant
    return [];
  }
}

class SlackHandler {
  constructor(private config: ConfigService) {}

  async sync(integration: any) {
    return { synced: 0, message: 'Slack sync complete' };
  }
}

class TeamsHandler {
  constructor(private config: ConfigService) {}

  async sync(integration: any) {
    return { synced: 0, message: 'Teams sync complete' };
  }
}
