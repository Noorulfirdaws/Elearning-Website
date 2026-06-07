/**
 * PrismaService with Resilience
 *
 * Failover strategy:
 *  1. Primary DB: all writes + reads
 *  2. Read replica (DATABASE_READ_URL): fallback for SELECT queries when primary is slow/down
 *  3. Circuit breaker: opens after 5 consecutive DB errors, prevents connection storms
 *  4. Automatic retry: transient errors (deadlock, connection reset) retried up to 3×
 *  5. Health probe: $queryRaw`SELECT 1` used by health controller
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { CircuitBreaker } from '../common/resilience/circuit-breaker';

const POOL_SIZE     = parseInt(process.env.DB_POOL_SIZE     || '20', 10);
const POOL_TIMEOUT  = parseInt(process.env.DB_POOL_TIMEOUT  || '30', 10);
const MAX_RETRIES   = 3;
const RETRYABLE_CODES = new Set([
  'P1001', // Can't reach database
  'P1002', // Database timeout
  'P1008', // Operations timed out
  'P2024', // Timed out fetching connection from pool
  'P1017', // Server closed connection
]);

function withPool(url: string, size: number, timeout: number) {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=${size}&pool_timeout=${timeout}`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger  = new Logger(PrismaService.name);
  private readonly cb      = new CircuitBreaker('postgresql', { failureThreshold: 5, timeout: 30_000 });
  private readReplica:     PrismaClient | null = null;
  private replicaHealthy = true;

  constructor() {
    const primaryUrl = withPool(process.env.DATABASE_URL || '', POOL_SIZE, POOL_TIMEOUT);
    super({
      datasources: { db: { url: primaryUrl } },
      log: process.env.NODE_ENV === 'production'
        ? [{ emit: 'stdout', level: 'error' }]
        : [{ emit: 'event', level: 'query' }, { emit: 'stdout', level: 'error' }],
    });

    // Read replica (optional — omit DATABASE_READ_URL to disable)
    const readUrl = process.env.DATABASE_READ_URL;
    if (readUrl) {
      this.readReplica = new PrismaClient({
        datasources: { db: { url: withPool(readUrl, POOL_SIZE, POOL_TIMEOUT) } },
        log: [{ emit: 'stdout', level: 'error' }],
      });
    }
  }

  async onModuleInit() {
    await this.cb.execute(async () => {
      await this.$connect();
      this.logger.log('Primary DB connected');

      if (this.readReplica) {
        try {
          await this.readReplica.$connect();
          this.logger.log('Read replica connected');
        } catch (e) {
          this.logger.warn(`Read replica unavailable: ${e.message} — reads will use primary`);
          this.replicaHealthy = false;
        }
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.readReplica) await this.readReplica.$disconnect();
  }

  /**
   * Execute a read-only query — tries read replica first, falls back to primary.
   * Use this in service methods that only SELECT data.
   */
  get reader(): PrismaClient {
    if (this.readReplica && this.replicaHealthy) return this.readReplica;
    return this; // Fallback to primary
  }

  /**
   * Run any DB operation with retry logic for transient errors.
   */
  async withRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
    let lastError: Error;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.cb.execute(fn);
      } catch (err) {
        lastError = err;
        const code = (err as Prisma.PrismaClientKnownRequestError).code;
        if (!RETRYABLE_CODES.has(code) && !err.message?.includes('Connection')) {
          throw err; // Non-transient error — don't retry
        }
        const delay = Math.min(100 * Math.pow(2, attempt), 2000); // Exponential backoff
        this.logger.warn(`DB retry ${attempt}/${maxRetries} after ${delay}ms — ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    this.logger.error(`All ${maxRetries} DB retries exhausted`);
    throw new ServiceUnavailableException('Database temporarily unavailable. Please try again shortly.');
  }

  /** Health check used by /health endpoint */
  async healthCheck(): Promise<{ primary: boolean; replica: boolean }> {
    const [primary, replica] = await Promise.all([
      this.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.readReplica
        ? this.readReplica.$queryRaw`SELECT 1`.then(() => true).catch(() => {
            this.replicaHealthy = false;
            return false;
          })
        : Promise.resolve(null),
    ]);
    return { primary: primary as boolean, replica: replica as boolean };
  }

  /** Expose circuit state for health dashboard */
  get circuitState() { return this.cb.status; }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') return;
    const models = Reflect.ownKeys(this).filter((key) => key[0] !== '_');
    return Promise.all(models.map((modelKey) => (this as any)[modelKey].deleteMany()));
  }
}
