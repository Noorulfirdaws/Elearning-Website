# LMS Platform

A production-grade Learning Management System built with **NestJS**, **Next.js 14**, and **React Native/Expo**.

---

## Architecture

```
lms-platform/
├── apps/
│   ├── api/          # NestJS REST API (port 3001)
│   ├── web/          # Next.js 14 frontend (port 3000)
│   └── mobile/       # React Native / Expo
├── packages/
│   └── database/     # Prisma schema + generated client
├── monitoring/       # Prometheus · Grafana · Alertmanager
├── load-testing/     # k6 test scenarios
├── security/         # Security audit scripts
└── scripts/
    └── backup/       # Backup & restore scripts
```

### Technology Stack

| Layer | Technology |
|---|---|
| API | NestJS 10, TypeScript, Prisma 5 |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Search | Meilisearch |
| Video | Mux |
| Storage | AWS S3 |
| Payments | Stripe |
| Monitoring | Prometheus + Grafana + Alertmanager |
| Load Testing | k6 |
| Process Manager | pm2 |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop
- pm2 (`npm i -g pm2`)

### 1. Clone & Install

```bash
git clone https://github.com/noorulfirdaws/lms-platform
cd lms-platform
pnpm install
```

### 2. Environment

```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your credentials
```

### 3. Database

```bash
# Start Postgres container
docker start djib-taxi-db

# Create LMS database
docker exec djib-taxi-db psql -U postgres -c "CREATE DATABASE lms;"

# Push schema
cd packages/database && npx prisma db push
```

### 4. Start Services

```bash
# Start Redis
docker start lms-redis || docker run -d --name lms-redis -p 6379:6379 redis:7-alpine

# Start Meilisearch
docker start lms-meilisearch || docker run -d --name lms-meilisearch -p 7700:7700 getmeili/meilisearch:v1.8

# Start API via pm2
cd apps/api && pm2 start ecosystem.config.js

# Start monitoring stack
cd monitoring && docker compose -f docker-compose.monitoring.yml up -d
```

### 5. Verify

| Service | URL | Credentials |
|---|---|---|
| API | http://localhost:3001/api/v1 | — |
| Swagger | http://localhost:3001/api/docs | — |
| Grafana | http://localhost:3100 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Alertmanager | http://localhost:9093 | — |

---

## API Reference

Full interactive docs at **http://localhost:3001/api/docs**

### Authentication

```bash
# Register
POST /api/v1/auth/register
{ "email": "user@example.com", "password": "...", "firstName": "...", "lastName": "..." }

# Login
POST /api/v1/auth/login
{ "email": "...", "password": "..." }
# Returns: { accessToken, refreshToken }

# Refresh token
POST /api/v1/auth/refresh
Authorization: Bearer <refreshToken>
```

### Key Endpoints

```
GET  /api/v1/courses              List/search courses
POST /api/v1/courses              Create course (instructor)
GET  /api/v1/courses/:id          Course detail
POST /api/v1/enrollments          Enrol in a course
GET  /api/v1/progress             My learning progress
POST /api/v1/payments/checkout    Create Stripe checkout session
GET  /api/v1/analytics/overview   Platform analytics (admin)
GET  /api/v1/health               Liveness probe
GET  /api/v1/health/ready         Readiness probe
GET  /api/v1/metrics              Prometheus metrics
GET  /api/v1/beta/flags           Feature flags
POST /api/v1/beta/feedback        Submit beta feedback
```

---

## Monitoring

### Grafana Dashboards

| Dashboard | URL | Description |
|---|---|---|
| API Overview | http://localhost:3100/d/lms-api-overview | RPS, latency, errors, circuit breakers |
| Business Metrics | http://localhost:3100/d/lms-business | Revenue, enrollments, active learners |
| Resilience | http://localhost:3100/d/lms-resilience | Failover states, queue depths |

### Key Metrics

```promql
# Request rate
rate(lms_http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(lms_http_request_duration_seconds_bucket[5m]))

# Error rate
rate(lms_http_requests_total{status=~"5.."}[5m]) / rate(lms_http_requests_total[5m])

# Circuit breaker state (2 = OPEN = degraded)
lms_circuit_breaker_state

# Redis health
redis_up

# PostgreSQL health
pg_up
```

### Alert Rules

| Alert | Severity | Condition |
|---|---|---|
| APIDown | critical | API unreachable for 2m |
| HighErrorRate | critical | Error rate > 5% for 5m |
| StripeCircuitOpen | critical | Stripe circuit breaker OPEN |
| DatabaseCircuitOpen | critical | DB circuit breaker OPEN |
| HighLatencyP95 | warning | P95 > 1s for 10m |
| PaymentRetryQueueHigh | warning | > 100 queued retries |

---

## Load Testing

Requires **k6** installed: https://k6.io/docs/get-started/installation/

```bash
# Smoke test (2 VUs × 30s)
k6 run load-testing/scenarios/01-smoke.js

# Load test (0→50 VUs, 8 minutes)
k6 run load-testing/scenarios/02-load.js

# Stress test (0→200 VUs)
k6 run load-testing/scenarios/03-stress.js

# Soak test (30 VUs × 30 minutes)
k6 run load-testing/scenarios/04-soak.js

# With custom base URL
k6 run --env BASE_URL=https://api.lms.example.com load-testing/scenarios/02-load.js
```

### SLOs

| Metric | Target |
|---|---|
| P95 latency | < 500ms |
| P99 latency | < 1000ms |
| Error rate | < 1% |
| Throughput | > 100 req/s |
| RTO (restore) | < 5 minutes |
| RPO (data loss) | < 25 hours |

---

## Security

### Running the Security Audit

```bash
# Full audit against running API
npx ts-node security/security-audit.ts --base-url http://localhost:3001

# Results saved to security/audit-report.json
```

### Dependency Vulnerability Scan

```bash
pnpm audit
pnpm audit --fix  # auto-fix where possible
```

### Current Known Vulnerabilities (from audit)

- **26 high** — primarily in `next@14.2.x` (upgrade to Next.js 15.5.16 resolves most)
- **26 moderate** — transitive deps; review individually
- **7 low** — low risk, monitor

### Remediation Plan

```bash
# Upgrade Next.js to fix cache poisoning CVE
cd apps/web && pnpm add next@latest

# Audit again to confirm
pnpm audit
```

---

## Backup & Recovery

### Manual Backup

```bash
# Full backup (DB + Redis + configs)
bash scripts/backup/backup.sh

# Upload to S3
bash scripts/backup/backup.sh --s3

# Dry run (see what would happen)
bash scripts/backup/backup.sh --dry-run
```

### Restore

```bash
# Restore latest backup (DESTRUCTIVE — drops existing DB)
bash scripts/backup/restore.sh --latest

# Restore specific backup
bash scripts/backup/restore.sh --backup-dir ./backups/20260607_220000
```

### Validate a Backup

```bash
# Restore to a test DB, run integrity checks, report RTO
bash scripts/backup/validate-backup.sh --backup-dir ./backups/20260607_220000
```

### Automated Backups

Add to Windows Task Scheduler or cron:
```bash
# Daily at 2am
0 2 * * * cd /path/to/lms-platform && bash scripts/backup/backup.sh --s3 >> logs/backup.log 2>&1
```

---

## Beta Testing

### Feature Flags

```bash
# List all flags
GET /api/v1/beta/flags

# Check if a flag is on for a user
GET /api/v1/beta/flags/new-video-player/check?userId=abc123

# Update rollout percentage (admin)
PATCH /api/v1/beta/flags/new-video-player
{ "rolloutPct": 25 }

# Enrol specific users in beta
POST /api/v1/beta/enrol
{ "userId": "abc123", "flags": ["new-video-player", "ai-course-recommendations"] }
```

### Collecting Feedback

```bash
POST /api/v1/beta/feedback
{
  "userId": "abc123",
  "type": "bug",           # bug | feature | ux | performance | general
  "sentiment": "negative", # positive | neutral | negative
  "title": "Video player crashes on iOS",
  "description": "...",
  "feature": "new-video-player",
  "url": "/courses/abc/lessons/123",
  "rating": 2              # 1–5
}
```

### Active Beta Features

| Feature | Rollout | Description |
|---|---|---|
| `new-video-player` | 20% | HLS adaptive bitrate player |
| `ai-course-recommendations` | 10% | GPT-4 personalised suggestions |
| `new-quiz-engine` | 50% | Rebuilt quiz with partial scoring |
| `community-v2` | 0% | Redesigned discussion forum |
| `stripe-tax` | 5% | Automatic tax via Stripe Tax |

---

## Development

### Commands

```bash
# Start API with hot reload
cd apps/api && pm2 start ecosystem.config.js --watch

# API logs
pm2 logs lms-api

# Restart API
pm2 restart lms-api

# TypeScript compile check
cd apps/api && npx tsc --noEmit

# Run tests
cd apps/api && pnpm test

# Run e2e tests
cd apps/api && pnpm test:e2e
```

### Environment Variables

See `apps/api/.env` for full list. Critical variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` | Redis hostname |
| `JWT_SECRET` | JWT signing secret (rotate in prod!) |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `MUX_TOKEN_ID` | Mux video token |
| `AWS_ACCESS_KEY_ID` | S3 access key |

---

## Production Deployment

### Docker Compose (full stack)

```bash
# Build and start all services
docker compose up -d --build

# Scale API horizontally
docker compose up -d --scale api=3
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check HPA status
kubectl get hpa -n lms

# View pod status
kubectl get pods -n lms
```

### Environment Checklist

- [ ] Rotate all dev JWT secrets
- [ ] Set real Stripe keys (live mode)
- [ ] Configure real AWS S3 bucket
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS / TLS termination
- [ ] Configure real Alertmanager receivers (Slack, PagerDuty)
- [ ] Set up automated backups to S3
- [ ] Upgrade Next.js to fix high CVEs
- [ ] Enable K8s pod autoscaling
- [ ] Set up log aggregation (ELK / Loki)

---

## Contributing

1. Branch from `main`
2. Follow existing module structure
3. Add tests for new services
4. Run `pnpm audit` before PR
5. Ensure `pnpm test` passes

---

## License

MIT
