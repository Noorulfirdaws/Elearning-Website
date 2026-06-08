/**
 * Health + Metrics Controller
 *
 * GET /health          — Liveness probe (k8s)
 * GET /health/ready    — Readiness probe (DB must respond)
 * GET /health/detailed — Full dependency dashboard
 * GET /metrics         — Prometheus scrape endpoint
 */
import { Controller, Get, Header, Res, Req, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService }   from '../../config/prisma.service';
import { CacheService }    from '../../common/cache/cache.service';
import { SearchService }   from '../search/search.service';
import { VideoService }    from '../video/video.service';
import { PaymentsService } from '../payments/payments.service';
import { MetricsService }  from '../../common/metrics/metrics.service';

@SkipThrottle({ short: true, medium: true, long: true })   // Health + metrics must never be rate-limited
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private prisma:   PrismaService,
    private cache:    CacheService,
    private search:   SearchService,
    private video:    VideoService,
    private payments: PaymentsService,
    private metrics:  MetricsService,
    @InjectQueue('progress-heartbeat') private progressQ: Queue,
    @InjectQueue('quiz-grading')       private quizQ:     Queue,
    @InjectQueue('payment-retry')      private paymentQ:  Queue,
  ) {}

  // ── Liveness ──────────────────────────────────────────────────────────────
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  // ── Readiness ─────────────────────────────────────────────────────────────
  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe — DB must be reachable' })
  async readiness(@Res() res: Response) {
    try {
      const db = await this.prisma.healthCheck();
      if (!db.primary) {
        return res.status(503).json({ status: 'not_ready', reason: 'primary DB unavailable' });
      }
      return res.json({ status: 'ready', db });
    } catch (e) {
      return res.status(503).json({ status: 'not_ready', reason: e.message });
    }
  }

  // ── Detailed ──────────────────────────────────────────────────────────────
  @Public()
  @Get('health/detailed')
  @ApiOperation({ summary: 'All service statuses — for ops dashboard' })
  async detailed() {
    const [db, depths] = await Promise.all([
      this.prisma.healthCheck().catch(() => ({ primary: false, replica: false })),
      Promise.all([
        this.progressQ.getWaitingCount().catch(() => -1),
        this.quizQ.getWaitingCount().catch(() => -1),
        this.paymentQ.getWaitingCount().catch(() => -1),
      ]),
    ]);

    const ch = this.cache.health();
    const sh = this.search.health();
    const vh = this.video.health();
    const ph = this.payments.health();

    const stateNum = (s: string) => s === 'CLOSED' ? 0 : s === 'HALF_OPEN' ? 1 : 2;

    // Push into Prometheus while we have the data
    this.metrics.circuitBreakerState.set({ service: 'postgresql' },  stateNum(String(this.prisma.circuitState?.state)));
    this.metrics.circuitBreakerState.set({ service: 'redis' },       stateNum(ch.circuit));
    this.metrics.circuitBreakerState.set({ service: 'meilisearch' }, stateNum(sh.circuit));
    this.metrics.circuitBreakerState.set({ service: 'mux' },         stateNum(vh.circuit));
    this.metrics.circuitBreakerState.set({ service: 'stripe' },      stateNum(ph.circuit));
    this.metrics.cacheMemoryFallbackSize.set(ch.fallbackSize);
    this.metrics.searchIndexPendingWrites.set(sh.pendingWrites);
    this.metrics.queueDepth.set({ queue: 'progress' },      depths[0]);
    this.metrics.queueDepth.set({ queue: 'quiz-grading' },  depths[1]);
    this.metrics.queueDepth.set({ queue: 'payment-retry' }, depths[2]);

    return {
      status: db.primary && ch.circuit !== 'OPEN' ? 'healthy' : 'degraded',
      ts: new Date().toISOString(),
      services: {
        postgresql:  { ...db,  circuit: this.prisma.circuitState?.state },
        redis:       { connected: ch.connected, usingFallback: ch.usingFallback, circuit: ch.circuit, fallbackSize: ch.fallbackSize },
        meilisearch: { circuit: sh.circuit, pendingWrites: sh.pendingWrites },
        mux:         { circuit: vh.circuit },
        stripe:      { circuit: ph.circuit },
      },
      queues: {
        progress:     depths[0],
        quizGrading:  depths[1],
        paymentRetry: depths[2],
      },
    };
  }

  // ── Prometheus scrape ─────────────────────────────────────────────────────
  // Restricted to localhost and internal Docker network only
  private readonly METRICS_ALLOWED = ['127.0.0.1', '::1', '::ffff:127.0.0.1', '172.', '10.', '192.168.'];

  @Public()
  @Get('metrics')
  @Header('Cache-Control', 'no-cache, no-store')
  async prometheusMetrics(@Req() req: Request, @Res() res: Response) {
    const ip = (req.ip || req.socket?.remoteAddress || '');
    const allowed = process.env.NODE_ENV === 'development' ||
      this.METRICS_ALLOWED.some(prefix => ip.startsWith(prefix));
    if (!allowed) throw new ForbiddenException('Metrics endpoint is internal only');
    res.set('Content-Type', this.metrics.contentType());
    res.end(await this.metrics.getMetrics());
  }
}
