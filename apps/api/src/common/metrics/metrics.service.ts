/**
 * MetricsService — Prometheus instrumentation for the LMS API
 *
 * Exposes:
 *  - HTTP request rate, latency (P50/P95/P99), error rate
 *  - DB query duration (per model/operation)
 *  - Redis hit/miss rate, latency
 *  - Queue depth and processing time (Bull)
 *  - Business metrics: enrollments/sec, active learners, video plays
 *  - Circuit breaker state transitions
 *  - Node.js process metrics (memory, CPU, event loop lag)
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
  Summary,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  // ── HTTP ──────────────────────────────────────────────────────────────────
  readonly httpRequestsTotal = new Counter({
    name: 'lms_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'lms_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });

  readonly httpRequestSize = new Histogram({
    name: 'lms_http_request_size_bytes',
    help: 'HTTP request body size',
    labelNames: ['method', 'route'],
    buckets: [100, 1_000, 10_000, 100_000, 1_000_000],
  });

  readonly httpActiveRequests = new Gauge({
    name: 'lms_http_active_requests',
    help: 'Currently active HTTP connections',
  });

  // ── Database ──────────────────────────────────────────────────────────────
  readonly dbQueryDuration = new Histogram({
    name: 'lms_db_query_duration_seconds',
    help: 'Prisma query duration',
    labelNames: ['model', 'operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  });

  readonly dbQueriesTotal = new Counter({
    name: 'lms_db_queries_total',
    help: 'Total DB queries',
    labelNames: ['model', 'operation', 'status'],
  });

  readonly dbPoolSize = new Gauge({
    name: 'lms_db_pool_connections',
    help: 'Database connection pool current size',
    labelNames: ['replica'],
  });

  readonly dbCircuitState = new Gauge({
    name: 'lms_db_circuit_state',
    help: 'DB circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
    labelNames: ['service'],
  });

  // ── Cache / Redis ─────────────────────────────────────────────────────────
  readonly cacheHitsTotal = new Counter({
    name: 'lms_cache_hits_total',
    help: 'Cache hits',
    labelNames: ['backend'], // redis | memory
  });

  readonly cacheMissesTotal = new Counter({
    name: 'lms_cache_misses_total',
    help: 'Cache misses',
    labelNames: ['backend'],
  });

  readonly cacheOperationDuration = new Histogram({
    name: 'lms_cache_operation_duration_seconds',
    help: 'Cache get/set latency',
    labelNames: ['operation', 'backend'],
    buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
  });

  readonly redisCircuitState = new Gauge({
    name: 'lms_redis_circuit_state',
    help: 'Redis circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  });

  readonly cacheMemoryFallbackSize = new Gauge({
    name: 'lms_cache_memory_fallback_size',
    help: 'In-memory LRU fallback entry count',
  });

  // ── Search ────────────────────────────────────────────────────────────────
  readonly searchRequestsTotal = new Counter({
    name: 'lms_search_requests_total',
    help: 'Search requests',
    labelNames: ['source'], // meilisearch | postgresql
  });

  readonly searchDuration = new Histogram({
    name: 'lms_search_duration_seconds',
    help: 'Search query duration',
    labelNames: ['source'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  });

  readonly searchIndexPendingWrites = new Gauge({
    name: 'lms_search_pending_index_writes',
    help: 'Meilisearch buffered index writes during outage',
  });

  // ── Queue (Bull) ──────────────────────────────────────────────────────────
  readonly queueJobsTotal = new Counter({
    name: 'lms_queue_jobs_total',
    help: 'Queue jobs processed',
    labelNames: ['queue', 'status'], // completed | failed | stalled
  });

  readonly queueJobDuration = new Histogram({
    name: 'lms_queue_job_duration_seconds',
    help: 'Queue job processing time',
    labelNames: ['queue'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10, 30],
  });

  readonly queueDepth = new Gauge({
    name: 'lms_queue_depth',
    help: 'Jobs waiting in queue',
    labelNames: ['queue'],
  });

  // ── Circuit Breakers ──────────────────────────────────────────────────────
  readonly circuitBreakerState = new Gauge({
    name: 'lms_circuit_breaker_state',
    help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
    labelNames: ['service'],
  });

  readonly circuitBreakerTrips = new Counter({
    name: 'lms_circuit_breaker_trips_total',
    help: 'Circuit breaker state changes to OPEN',
    labelNames: ['service'],
  });

  // ── Business Metrics ──────────────────────────────────────────────────────
  readonly enrollmentsTotal = new Counter({
    name: 'lms_enrollments_total',
    help: 'Total course enrollments',
    labelNames: ['course_level'], // BEGINNER | INTERMEDIATE | ADVANCED
  });

  readonly paymentsTotal = new Counter({
    name: 'lms_payments_total',
    help: 'Payment events',
    labelNames: ['status', 'provider'], // completed|failed | stripe
  });

  readonly paymentRevenue = new Counter({
    name: 'lms_payment_revenue_cents_total',
    help: 'Total payment revenue in cents',
    labelNames: ['currency'],
  });

  readonly activeLearners = new Gauge({
    name: 'lms_active_learners',
    help: 'Learners with progress heartbeat in last 5 minutes',
  });

  readonly videoPlaysTotal = new Counter({
    name: 'lms_video_plays_total',
    help: 'Video play events',
    labelNames: ['provider'], // mux | s3
  });

  readonly videoProgressUpdatesTotal = new Counter({
    name: 'lms_video_progress_updates_total',
    help: 'Heartbeat progress updates received',
  });

  readonly quizSubmissionsTotal = new Counter({
    name: 'lms_quiz_submissions_total',
    help: 'Quiz submissions',
    labelNames: ['status'], // passed | failed | duplicate
  });

  readonly certificatesIssuedTotal = new Counter({
    name: 'lms_certificates_issued_total',
    help: 'Certificates generated',
  });

  readonly registrationsTotal = new Counter({
    name: 'lms_registrations_total',
    help: 'User registrations',
    labelNames: ['method'], // email | google | github
  });

  readonly loginAttemptsTotal = new Counter({
    name: 'lms_login_attempts_total',
    help: 'Login attempts',
    labelNames: ['status'], // success | failed | locked
  });

  readonly mfaVerificationsTotal = new Counter({
    name: 'lms_mfa_verifications_total',
    help: 'MFA verification events',
    labelNames: ['status'], // success | failed
  });

  // ── External Services ─────────────────────────────────────────────────────
  readonly externalRequestDuration = new Histogram({
    name: 'lms_external_request_duration_seconds',
    help: 'Duration of calls to external services',
    labelNames: ['service', 'operation', 'status'], // stripe|mux|s3|meilisearch
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });

  readonly stripeWebhooksTotal = new Counter({
    name: 'lms_stripe_webhooks_total',
    help: 'Stripe webhook events received',
    labelNames: ['event_type', 'status'], // processed | duplicate | stale | invalid
  });

  onModuleInit() {
    // Node.js process metrics: CPU, memory, GC, event loop lag, file descriptors
    collectDefaultMetrics({ prefix: 'lms_node_', gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5] });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Map string state to number for Grafana state timelines */
  stateToNumber(state: 'CLOSED' | 'HALF_OPEN' | 'OPEN'): number {
    return state === 'CLOSED' ? 0 : state === 'HALF_OPEN' ? 1 : 2;
  }

  /** Flush all metrics as Prometheus text format */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  contentType(): string {
    return register.contentType;
  }
}
