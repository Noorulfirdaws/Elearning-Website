# LMS Platform — Architecture Decision Records

## ADR-001: NestJS for API layer

**Status:** Accepted

**Context:** Need a structured, testable API with dependency injection, guards, interceptors, and pipes.

**Decision:** NestJS over Express/Fastify standalone because:
- Built-in DI container (no manual wiring)
- Decorators-first OpenAPI generation via `@nestjs/swagger`
- First-class support for Bull queues, Passport, WebSockets
- Strong TypeScript support with reflect-metadata

**Consequences:** Slightly higher cold-start time. Mitigated by pm2 process manager.

---

## ADR-002: Prisma over TypeORM / Drizzle

**Status:** Accepted

**Context:** ORM selection for PostgreSQL.

**Decision:** Prisma 5 because:
- Type-safe generated client (no runtime type assertions)
- Schema-first with `schema.prisma` as single source of truth
- Excellent migration tooling (`prisma migrate`)
- `prisma db push` for dev iteration speed

**Consequences:** Prisma client must be regenerated after schema changes (`npx prisma generate`). Service code must match generated types exactly.

---

## ADR-003: Stripe Circuit Breaker + Bull Retry Queue

**Status:** Accepted

**Context:** Stripe outages must not cause payment data loss.

**Decision:**
- Circuit breaker (5 failures → OPEN, 60s timeout)
- When OPEN: save payment as `PENDING` in DB, queue Bull retry job
- 288 retry attempts × 5min interval = 24h coverage window
- Webhook idempotency via `event.id` deduplication

**Consequences:** Payments may be delayed up to 24h during outage. Users notified via queued notification when payment eventually processes.

---

## ADR-004: Prometheus + Grafana over Datadog / New Relic

**Status:** Accepted

**Context:** Observability stack selection.

**Decision:** Self-hosted Prometheus + Grafana because:
- Zero per-seat cost
- Full control over retention (30d configured)
- prom-client for custom business metrics
- 3 pre-built dashboards: API, Business, Resilience

**Consequences:** Ops team must manage the monitoring stack. Mitigated by docker-compose and automated config provisioning.

---

## ADR-005: pnpm Workspaces

**Status:** Accepted

**Context:** Monorepo package management.

**Decision:** pnpm over npm/yarn workspaces because:
- Content-addressable store (disk efficient)
- Strict dependency isolation by default
- `--filter` flag for targeted installs

**Consequences:** `shamefully-hoist=true` required in `.npmrc` to expose transitive deps to NestJS (which uses `require()` at runtime for peer deps like `express`).

---

## System Context Diagram

```
                         ┌──────────────────────────────────┐
                         │         External Services        │
                         │  Stripe · Mux · AWS S3 · Twilio  │
                         └──────────────┬───────────────────┘
                                        │ HTTPS
                    ┌───────────────────▼──────────────────────┐
                    │            NestJS API (port 3001)         │
                    │  Auth · Courses · Payments · Analytics   │
                    │  Bull Queues · WebSockets · Swagger       │
                    └──┬────────────┬──────────┬───────────────┘
                       │            │          │
              ┌────────▼──┐  ┌──────▼─┐  ┌───▼──────┐
              │ PostgreSQL│  │ Redis  │  │Meilisearch│
              │ (port5432)│  │(6379)  │  │ (7700)   │
              └───────────┘  └────────┘  └──────────┘
                    │
         ┌──────────▼──────────────────────────────────┐
         │            Monitoring Stack                  │
         │  Prometheus(9090) · Grafana(3100)            │
         │  Alertmanager(9093) · node-exporter(9100)    │
         │  postgres-exporter(9187) · redis-exporter    │
         └─────────────────────────────────────────────┘
```

## Data Flow: Course Purchase

```
Browser → POST /payments/checkout
  → PaymentsService.createStripeCheckoutSession()
  → CircuitBreaker.execute()
    ├── [CLOSED] → Stripe API → save to DB → return redirect URL
    └── [OPEN]   → save DB (PENDING) → queue Bull retry → return {queued:true}
        └── BullRetry (every 5min, up to 24h)
            ├── CircuitBreaker attempts Stripe again
            │   ├── Success → mark payment COMPLETED → notify user
            │   └── Fail    → reschedule
            └── After 24h → alert ops team
```

## Security Layers

```
Internet → Helmet (CSP, HSTS, X-Frame) → CORS allowlist
         → ThrottlerGuard (10/s, 50/10s, 200/min)
         → JwtAuthGuard (JWT validation + role check)
         → ValidationPipe (class-validator DTOs)
         → Prisma (parameterised queries, no SQLi)
         → Response transform (no stack traces, no internals)
```
