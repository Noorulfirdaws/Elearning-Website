/**
 * CacheService — Redis with in-memory fallback on outage.
 *
 * Redis outage behaviour:
 *  1. Circuit breaker opens after 5 Redis errors
 *  2. All cache operations fall back to in-process LRU (1,000 entries, 60s TTL)
 *  3. System continues fully functional — only cache hit rate drops
 *  4. Redis reconnect is automatic (redis client retry strategy)
 *  5. Circuit breaker moves to HALF_OPEN every 30s to probe recovery
 *
 * In-memory fallback trade-offs:
 *  - Not shared across pods (cache misses go to DB — acceptable)
 *  - Max 1,000 entries prevents memory leak
 *  - 60-second max TTL prevents serving stale data too long
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { CircuitBreaker } from '../resilience/circuit-breaker';

export const TTL = {
  CATALOG:      60 * 5,
  COURSE:       60 * 5,
  LESSON:       60 * 10,
  USER:         60,
  PROGRESS:     30,
  QUIZ_RESULT:  60 * 60,
  CERTIFICATE:  60 * 60 * 24,
  SEARCH:       60 * 2,
  LEADERBOARD:  60,
} as const;

// ── Minimal in-process LRU cache (no dependencies) ───────────────────────────
interface LRUEntry { value: string; expiresAt: number }

class InMemoryLRU {
  private map = new Map<string, LRUEntry>();
  constructor(private readonly maxSize = 1000) {}

  get(key: string): string | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.map.delete(key); return null; }
    // LRU: re-insert to move to end
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: string, ttlSecs: number) {
    if (this.map.size >= this.maxSize) {
      // Evict oldest entry
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlSecs * 1000 });
  }

  delete(key: string) { this.map.delete(key); }

  deletePattern(pattern: string) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.map.keys()) {
      if (regex.test(key)) this.map.delete(key);
    }
  }

  get size() { return this.map.size; }
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: RedisClientType;
  private connected = false;
  private readonly cb = new CircuitBreaker('redis', { failureThreshold: 5, timeout: 30_000, requestTimeout: 2_000 });
  private readonly fallback = new InMemoryLRU(1000);
  private usingFallback = false;

  constructor(private config: ConfigService) {
    this.client = createClient({
      socket: {
        host: config.get('app.redis.host', 'localhost'),
        port: config.get<number>('app.redis.port', 6379),
        reconnectStrategy: (retries) => {
          if (retries > 50) {
            this.logger.error('Redis reconnect limit reached');
            return new Error('Redis reconnect limit');
          }
          return Math.min(retries * 100, 3000);
        },
      },
      password: config.get('app.redis.password'),
    }) as RedisClientType;

    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
      this.connected = false;
    });
    this.client.on('connect', () => {
      this.connected = true;
      this.usingFallback = false;
      this.logger.log('Redis connected — switching from fallback to Redis');
    });
    this.client.on('reconnecting', () => this.logger.warn('Redis reconnecting...'));

    this.client.connect().catch((e) => {
      this.logger.warn(`Redis initial connect failed: ${e.message} — using in-memory fallback`);
      this.usingFallback = true;
    });
  }

  async onModuleDestroy() {
    if (this.connected) await this.client.quit().catch(() => {});
  }

  // ── Core ops ──────────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || this.cb.isOpen) {
      const val = this.fallback.get(key);
      return val ? (JSON.parse(val) as T) : null;
    }
    try {
      const val = await this.cb.execute(
        () => this.client.get(key),
        () => this.fallback.get(key),
      );
      return val ? (JSON.parse(val as string) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSecs: number): Promise<void> {
    const serialized = JSON.stringify(value);
    // Always write to fallback so it's warm if Redis fails
    this.fallback.set(key, serialized, Math.min(ttlSecs, 60));

    if (!this.connected || this.cb.isOpen) return;
    try {
      await this.cb.execute(() => this.client.setEx(key, ttlSecs, serialized));
    } catch {}
  }

  async del(key: string): Promise<void> {
    this.fallback.delete(key);
    if (!this.connected || this.cb.isOpen) return;
    try { await this.cb.execute(() => this.client.del(key)); } catch {}
  }

  async delPattern(pattern: string): Promise<void> {
    this.fallback.deletePattern(pattern);
    if (!this.connected || this.cb.isOpen) return;
    try {
      await this.cb.execute(async () => {
        const keys = await this.client.keys(pattern);
        if (keys.length) await this.client.del(keys);
      });
    } catch {}
  }

  async getOrSet<T>(key: string, ttlSecs: number, dbFn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await dbFn();
    await this.set(key, fresh, ttlSecs);
    return fresh;
  }

  async incr(key: string, ttlSecs = 3600): Promise<number> {
    if (!this.connected || this.cb.isOpen) return 0;
    try {
      const count = await this.cb.execute(() => this.client.incr(key));
      if (count === 1) await this.client.expire(key, ttlSecs);
      return count as number;
    } catch { return 0; }
  }

  async markSeen(namespace: string, id: string, ttlSecs = 3600): Promise<boolean> {
    const key = `seen:${namespace}:${id}`;
    if (!this.connected || this.cb.isOpen) {
      // Fallback: use in-memory — acceptable (duplicate risk only during Redis outage)
      const exists = this.fallback.get(key) !== null;
      if (!exists) this.fallback.set(key, '1', Math.min(ttlSecs, 60));
      return exists;
    }
    try {
      const result = await this.cb.execute(() =>
        this.client.set(key, '1', { NX: true, EX: ttlSecs })
      );
      return result === null;
    } catch { return false; }
  }

  // ── Status ────────────────────────────────────────────────────────────────

  health(): { connected: boolean; usingFallback: boolean; circuit: string; fallbackSize: number } {
    return {
      connected:     this.connected,
      usingFallback: !this.connected || this.cb.isOpen,
      circuit:       this.cb.status.state,
      fallbackSize:  this.fallback.size,
    };
  }

  // ── Key builders ──────────────────────────────────────────────────────────
  static keys = {
    catalog:       (page: number, limit: number, filters?: string) => `catalog:${page}:${limit}:${filters || 'all'}`,
    course:        (id: string)   => `course:${id}`,
    courseSlug:    (slug: string) => `course:slug:${slug}`,
    lesson:        (id: string)   => `lesson:${id}`,
    userProfile:   (id: string)   => `user:${id}`,
    progress:      (uid: string, cid: string) => `progress:${uid}:${cid}`,
    quizResult:    (attemptId: string)        => `quiz:attempt:${attemptId}`,
    certificate:   (uid: string, cid: string) => `cert:${uid}:${cid}`,
    searchResults: (q: string)    => `search:${Buffer.from(q).toString('base64')}`,
    leaderboard:   (courseId: string) => `lb:${courseId}`,
  };
}
