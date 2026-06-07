/**
 * CacheService — Redis-backed cache for hot read paths.
 * Handles: course catalog, course detail, user profile, lesson progress,
 * leaderboards, quiz results.
 *
 * Cache TTLs are tuned for LMS access patterns:
 *  - Catalog / course detail:  5 min  (low write rate, high read rate)
 *  - User progress:            30 sec (updates every 30s heartbeat)
 *  - Quiz results:             1 hr   (immutable once graded)
 *  - Certificates:             24 hr  (rarely change)
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export const TTL = {
  CATALOG:      60 * 5,        // 5 minutes
  COURSE:       60 * 5,        // 5 minutes
  LESSON:       60 * 10,       // 10 minutes
  USER:         60,            // 1 minute
  PROGRESS:     30,            // 30 seconds
  QUIZ_RESULT:  60 * 60,       // 1 hour
  CERTIFICATE:  60 * 60 * 24, // 24 hours
  SEARCH:       60 * 2,        // 2 minutes
  LEADERBOARD:  60,            // 1 minute
} as const;

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: RedisClientType;
  private connected = false;

  constructor(private config: ConfigService) {
    this.client = createClient({
      socket: {
        host: config.get('app.redis.host', 'localhost'),
        port: config.get<number>('app.redis.port', 6379),
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
      },
      password: config.get('app.redis.password'),
    }) as RedisClientType;

    this.client.on('error', (err) => this.logger.error('Redis error', err.message));
    this.client.on('connect', () => { this.connected = true; this.logger.log('Redis connected'); });
    this.client.on('disconnect', () => { this.connected = false; });
    this.client.connect().catch((e) => this.logger.error('Redis connect failed', e.message));
  }

  async onModuleDestroy() {
    if (this.connected) await this.client.quit();
  }

  // ── Core get/set ───────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch (e) {
      this.logger.warn(`Cache GET failed: ${key} — ${e.message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSecs: number): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.setEx(key, ttlSecs, JSON.stringify(value));
    } catch (e) {
      this.logger.warn(`Cache SET failed: ${key} — ${e.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try { await this.client.del(key); } catch {}
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.connected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length) await this.client.del(keys);
    } catch (e) {
      this.logger.warn(`Cache DEL pattern failed: ${pattern} — ${e.message}`);
    }
  }

  // ── Cache-aside helper: read from cache or run db fn ─────────────────────
  async getOrSet<T>(key: string, ttlSecs: number, dbFn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await dbFn();
    await this.set(key, fresh, ttlSecs);
    return fresh;
  }

  // ── Distributed counter (for leaderboard, enrollment count) ──────────────
  async incr(key: string, ttlSecs = 3600): Promise<number> {
    if (!this.connected) return 0;
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, ttlSecs);
    return count;
  }

  // ── Bloom-filter–style dedup for quiz submissions ─────────────────────────
  async markSeen(namespace: string, id: string, ttlSecs = 3600): Promise<boolean> {
    if (!this.connected) return false;
    const key = `seen:${namespace}:${id}`;
    const result = await this.client.set(key, '1', { NX: true, EX: ttlSecs });
    return result === null; // null = key already existed → duplicate
  }

  // ── Cache key builders ────────────────────────────────────────────────────
  static keys = {
    catalog:       (page: number, limit: number, filters?: string) =>
                     `catalog:${page}:${limit}:${filters || 'all'}`,
    course:        (id: string)      => `course:${id}`,
    courseSlug:    (slug: string)    => `course:slug:${slug}`,
    lesson:        (id: string)      => `lesson:${id}`,
    userProfile:   (id: string)      => `user:${id}`,
    progress:      (uid: string, cid: string) => `progress:${uid}:${cid}`,
    quizResult:    (attemptId: string)        => `quiz:attempt:${attemptId}`,
    certificate:   (uid: string, cid: string) => `cert:${uid}:${cid}`,
    searchResults: (query: string)   => `search:${Buffer.from(query).toString('base64')}`,
    leaderboard:   (courseId: string) => `lb:${courseId}`,
  };
}
