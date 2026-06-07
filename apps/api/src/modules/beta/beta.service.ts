import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

export interface FeatureFlag {
  key:         string;
  enabled:     boolean;
  rolloutPct:  number;   // 0–100
  allowList:   string[]; // user IDs always enabled for
  blockList:   string[]; // user IDs always disabled for
  description: string;
  createdAt:   Date;
}

/** In-memory feature flag store (replace with DB/Redis in prod) */
const FLAGS: Map<string, FeatureFlag> = new Map([
  ['new-video-player', {
    key: 'new-video-player', enabled: true, rolloutPct: 20,
    allowList: [], blockList: [],
    description: 'Next-gen HLS video player with adaptive bitrate',
    createdAt: new Date(),
  }],
  ['ai-course-recommendations', {
    key: 'ai-course-recommendations', enabled: true, rolloutPct: 10,
    allowList: [], blockList: [],
    description: 'GPT-4 powered personalised course recommendations',
    createdAt: new Date(),
  }],
  ['new-quiz-engine', {
    key: 'new-quiz-engine', enabled: true, rolloutPct: 50,
    allowList: [], blockList: [],
    description: 'Rebuilt quiz engine with partial scoring and hints',
    createdAt: new Date(),
  }],
  ['community-v2', {
    key: 'community-v2', enabled: false, rolloutPct: 0,
    allowList: [], blockList: [],
    description: 'Redesigned discussion forum with threaded replies',
    createdAt: new Date(),
  }],
  ['stripe-tax', {
    key: 'stripe-tax', enabled: true, rolloutPct: 5,
    allowList: [], blockList: [],
    description: 'Automatic tax calculation via Stripe Tax',
    createdAt: new Date(),
  }],
]);

@Injectable()
export class BetaService {
  private readonly logger = new Logger(BetaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Deterministic rollout: same user always gets same result */
  isEnabled(flagKey: string, userId?: string): boolean {
    const flag = FLAGS.get(flagKey);
    if (!flag || !flag.enabled) return false;
    if (!userId)                return flag.rolloutPct === 100;
    if (flag.blockList.includes(userId)) return false;
    if (flag.allowList.includes(userId)) return true;
    // Deterministic hash: userId → 0–99
    const hash = userId.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffff, 0);
    return (hash % 100) < flag.rolloutPct;
  }

  getFlag(key: string): FeatureFlag | null {
    return FLAGS.get(key) ?? null;
  }

  listFlags(): FeatureFlag[] {
    return [...FLAGS.values()];
  }

  upsertFlag(flag: Partial<FeatureFlag> & { key: string }): FeatureFlag {
    const existing = FLAGS.get(flag.key) ?? {
      key: flag.key, enabled: false, rolloutPct: 0,
      allowList: [], blockList: [], description: '', createdAt: new Date(),
    };
    const updated = { ...existing, ...flag };
    FLAGS.set(flag.key, updated);
    this.logger.log(`Feature flag updated: ${flag.key} rollout=${updated.rolloutPct}%`);
    return updated;
  }

  /** Get all beta features enabled for a given user */
  getUserFlags(userId: string): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [key] of FLAGS) {
      result[key] = this.isEnabled(key, userId);
    }
    return result;
  }

  /** Enrol a user in beta programme */
  async enrolBeta(userId: string, flagKeys: string[]): Promise<void> {
    for (const key of flagKeys) {
      const flag = FLAGS.get(key);
      if (flag && !flag.allowList.includes(userId)) {
        flag.allowList.push(userId);
        this.logger.log(`User ${userId} enrolled in beta: ${key}`);
      }
    }
  }
}
