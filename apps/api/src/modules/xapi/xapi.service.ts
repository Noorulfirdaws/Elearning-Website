import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { v4 as uuidv4 } from 'uuid';

// xAPI Statement structure (Tin Can API)
export interface XApiStatement {
  id?: string;
  actor: {
    objectType?: 'Agent' | 'Group';
    name?: string;
    mbox?: string;
    account?: { homePage: string; name: string };
  };
  verb: {
    id: string; // IRI
    display?: Record<string, string>;
  };
  object: {
    objectType?: 'Activity' | 'StatementRef' | 'SubStatement';
    id: string; // IRI
    definition?: {
      name?: Record<string, string>;
      description?: Record<string, string>;
      type?: string;
      extensions?: Record<string, any>;
    };
  };
  result?: {
    score?: { scaled?: number; raw?: number; min?: number; max?: number };
    success?: boolean;
    completion?: boolean;
    response?: string;
    duration?: string; // ISO 8601 duration
    extensions?: Record<string, any>;
  };
  context?: {
    registration?: string;
    contextActivities?: any;
    revision?: string;
    platform?: string;
    language?: string;
    extensions?: Record<string, any>;
  };
  timestamp?: string;
  stored?: string;
  authority?: any;
  version?: string;
}

// Well-known xAPI verb IRIs
export const XAPI_VERBS = {
  COMPLETED: 'http://adlnet.gov/expapi/verbs/completed',
  PASSED: 'http://adlnet.gov/expapi/verbs/passed',
  FAILED: 'http://adlnet.gov/expapi/verbs/failed',
  INITIALIZED: 'http://adlnet.gov/expapi/verbs/initialized',
  TERMINATED: 'http://adlnet.gov/expapi/verbs/terminated',
  EXPERIENCED: 'http://adlnet.gov/expapi/verbs/experienced',
  ATTEMPTED: 'http://adlnet.gov/expapi/verbs/attempted',
  INTERACTED: 'http://adlnet.gov/expapi/verbs/interacted',
  PROGRESSED: 'http://adlnet.gov/expapi/verbs/progressed',
  ANSWERED: 'http://adlnet.gov/expapi/verbs/answered',
  WATCHED: 'https://w3id.org/xapi/video/verbs/watched',
  PLAYED: 'https://w3id.org/xapi/video/verbs/played',
  PAUSED: 'https://w3id.org/xapi/video/verbs/paused',
};

@Injectable()
export class XapiService {
  constructor(private prisma: PrismaService) {}

  // LRS (Learning Record Store) - Statement API
  async putStatement(statement: XApiStatement): Promise<string> {
    const id = statement.id || uuidv4();
    const stored = new Date().toISOString();

    await this.prisma.xapiStatement.create({
      data: {
        id,
        actorMbox: statement.actor.mbox,
        actorName: statement.actor.name,
        actorAccount: statement.actor.account as any,
        verbId: statement.verb.id,
        verbDisplay: statement.verb.display as any,
        objectId: statement.object.id,
        objectType: statement.object.objectType || 'Activity',
        objectDefinition: statement.object.definition as any,
        result: statement.result as any,
        context: statement.context as any,
        timestamp: statement.timestamp ? new Date(statement.timestamp) : new Date(),
        stored: new Date(stored),
        version: statement.version || '1.0.3',
        raw: statement as any,
      },
    });

    // Process completion triggers
    await this.processStatement(statement, id);

    return id;
  }

  async putStatements(statements: XApiStatement[]): Promise<string[]> {
    return Promise.all(statements.map(s => this.putStatement(s)));
  }

  async getStatement(id: string): Promise<XApiStatement | null> {
    const row = await this.prisma.xapiStatement.findUnique({ where: { id } });
    return row ? (row.raw as unknown as XApiStatement) : null;
  }

  async getStatements(params: {
    agent?: string;
    verb?: string;
    activity?: string;
    registration?: string;
    since?: string;
    until?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (params.agent) where.actorMbox = params.agent;
    if (params.verb) where.verbId = params.verb;
    if (params.activity) where.objectId = params.activity;
    if (params.since) where.stored = { ...where.stored, gte: new Date(params.since) };
    if (params.until) where.stored = { ...where.stored, lte: new Date(params.until) };

    const [statements, total] = await Promise.all([
      this.prisma.xapiStatement.findMany({
        where,
        orderBy: { stored: 'desc' },
        skip: params.offset || 0,
        take: params.limit || 50,
      }),
      this.prisma.xapiStatement.count({ where }),
    ]);

    return {
      statements: statements.map(s => s.raw),
      more: total > (params.offset || 0) + (params.limit || 50),
      total,
    };
  }

  // State API (document storage)
  async putState(activityId: string, agent: string, stateId: string, data: any, registration?: string) {
    await this.prisma.xapiState.upsert({
      where: { activityId_agentMbox_stateId: { activityId, agentMbox: agent, stateId } },
      create: { activityId, agentMbox: agent, stateId, data: data as any, registration },
      update: { data: data as any },
    });
  }

  async getState(activityId: string, agent: string, stateId: string) {
    const state = await this.prisma.xapiState.findUnique({
      where: { activityId_agentMbox_stateId: { activityId, agentMbox: agent, stateId } },
    });
    return state?.data;
  }

  async deleteState(activityId: string, agent: string, stateId: string) {
    await this.prisma.xapiState.deleteMany({
      where: { activityId, agentMbox: agent, stateId },
    });
  }

  // Activity Profile API
  async putActivityProfile(activityId: string, profileId: string, data: any) {
    await this.prisma.xapiActivityProfile.upsert({
      where: { activityId_profileId: { activityId, profileId } },
      create: { activityId, profileId, data: data as any },
      update: { data: data as any },
    });
  }

  async getActivityProfile(activityId: string, profileId: string) {
    const profile = await this.prisma.xapiActivityProfile.findUnique({
      where: { activityId_profileId: { activityId, profileId } },
    });
    return profile?.data;
  }

  private async processStatement(statement: XApiStatement, id: string) {
    const verbId = statement.verb.id;
    const actorMbox = statement.actor.mbox;

    // Find user by mbox (mailto:email@example.com)
    if (!actorMbox?.startsWith('mailto:')) return;
    const email = actorMbox.replace('mailto:', '');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    if (verbId === XAPI_VERBS.COMPLETED || verbId === XAPI_VERBS.PASSED) {
      const score = statement.result?.score?.scaled
        ? statement.result.score.scaled * 100
        : statement.result?.score?.raw;
      const success = statement.result?.success ?? (verbId === XAPI_VERBS.PASSED);

      await this.prisma.xapiCompletion.upsert({
        where: { userId_objectId: { userId: user.id, objectId: statement.object.id } },
        create: {
          userId: user.id,
          objectId: statement.object.id,
          objectType: statement.object.definition?.type || 'Activity',
          objectName: statement.object.definition?.name?.['en-US'] || '',
          completed: true,
          passed: success,
          score: score || 0,
          statementId: id,
        },
        update: {
          completed: true,
          passed: success,
          score: score || 0,
          statementId: id,
        },
      });
    }
  }

  async getUserCompletions(userId: string) {
    return this.prisma.xapiCompletion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLearnerReport(userId: string) {
    const [statements, completions] = await Promise.all([
      this.prisma.xapiStatement.count({ where: { actorMbox: `mailto:${userId}` } }),
      this.prisma.xapiCompletion.findMany({ where: { userId } }),
    ]);

    return {
      totalStatements: statements,
      completions: completions.length,
      passed: completions.filter(c => c.isPassed).length,
      failed: completions.filter(c => !c.isPassed).length,
      avgScore: completions.length
        ? completions.reduce((s, c) => s + c.score, 0) / completions.length
        : 0,
    };
  }
}
