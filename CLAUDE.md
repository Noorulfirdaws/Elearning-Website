# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Full-stack **Learning Management System (LMS)** monorepo with:
- **`apps/api`** — NestJS 10 REST API (port 3001)
- **`apps/web`** — Next.js 14 frontend (port 3000)
- **`apps/mobile`** — React Native / Expo app
- **`packages/database`** — Prisma schema + migrations (PostgreSQL)
- **`packages/shared`** — Shared TypeScript types

**Package manager:** pnpm workspaces + Turborepo. Node ≥ 20, pnpm ≥ 9.

---

## Essential Commands

### Running the API
```bash
# Start with pm2 (reads apps/api/.env automatically)
pm2 start apps/api/ecosystem.config.js
pm2 restart lms-api
pm2 logs lms-api --lines 50 --nostream

# Or run directly (dev/debug)
cd apps/api
node ../../node_modules/ts-node/dist/bin.js --transpile-only src/main.ts
```
> The API uses `ts-node --transpile-only` (skips type checking) to avoid TypeScript errors blocking startup.

### Running the Frontend
```bash
cd apps/web && pnpm dev        # http://localhost:3000
cd apps/mobile && npx expo start
```

### Database
```bash
# Schema is in packages/database/prisma/schema.prisma
# Push schema changes (dev — no migration files)
DATABASE_URL="postgresql://postgres:djib123@localhost:5432/lms?schema=public" \
  npx prisma db push --schema packages/database/prisma/schema.prisma

# Open Prisma Studio
DATABASE_URL="..." npx prisma studio --schema packages/database/prisma/schema.prisma

# Generate Prisma client after schema changes
DATABASE_URL="..." npx prisma generate --schema packages/database/prisma/schema.prisma
```

### Security Audit
```bash
node apps/api/node_modules/ts-node/dist/bin.js --transpile-only \
  --project apps/api/tsconfig.json \
  security/security-audit.ts --base-url http://localhost:3001
```

### Load Testing (k6 required)
```bash
k6 run load-testing/scenarios/01-smoke.js
k6 run load-testing/scenarios/02-load.js
k6 run load-testing/scenarios/03-stress.js
```

### Backup
```bash
bash scripts/backup/backup.sh       # Full backup
bash scripts/backup/validate-backup.sh  # Test restore + measure RTO
```

---

## Infrastructure (Docker)

```bash
# Core services (Postgres, Redis, Meilisearch)
docker-compose up -d

# Monitoring stack (Prometheus, Grafana, exporters)
docker-compose -f docker-compose.monitoring.yml up -d
```

**Service ports:**
| Service | Port |
|---|---|
| API | 3001 |
| Web | 3000 |
| PostgreSQL | 5432 (container: `lms_postgres`) |
| Redis | 6379 (container: `lms_redis`) |
| Meilisearch | 7700 |
| Prometheus | 9090 |
| Grafana | 3100 |
| Alertmanager | 9093 |

---

## API Architecture

### Auth Pattern
- **Global `JwtAuthGuard`** — all routes require JWT by default
- **`@Public()`** decorator — marks routes that skip JWT (login, register, etc.)
- **Global `ThrottlerGuard`** — rate limiting on all routes via DI (`APP_GUARD`)
- **`@SkipThrottle({ short: true, medium: true, long: true })`** — must pass all 3 named throttlers to skip (throttler v5 requirement)
- Three throttler tiers: `short` (10/s), `medium` (50/10s), `long` (200/min)

### Request/Response Flow
All responses are wrapped by `TransformInterceptor`:
```json
{ "success": true, "data": {...}, "timestamp": "..." }
```
Errors go through `HttpExceptionFilter` — no stack traces exposed in responses.

### Key Common Modules (`apps/api/src/common/`)
- **`cache/`** — Redis cache with in-memory fallback when Redis is down
- **`metrics/`** — Prometheus metrics via `prom-client` (scraped at `GET /metrics`)
- **`resilience/circuit-breaker.ts`** — Circuit breaker used by Stripe, DB, Redis, MUX, Meilisearch
- **`email/email.service.ts`** — Nodemailer SMTP service (Gmail configured)
- **`guards/jwt-auth.guard.ts`** — Global JWT guard with `@Public()` bypass

### Module Structure
Each feature module in `apps/api/src/modules/` follows:
```
module-name/
  module-name.module.ts
  module-name.controller.ts
  module-name.service.ts
  dto/
```

### API Prefix
All routes: `http://localhost:3001/api/v1/...`
Swagger docs: `http://localhost:3001/api/docs`

---

## Frontend Architecture

### Next.js App Router Layout
```
src/app/
  (auth)/         — login, register, verify-email, check-email, forgot/reset password
  (dashboard)/    — student dashboard, enrolled courses, course player
  (instructor)/   — instructor studio, course builder
  (marketing)/    — landing page, about, pricing
  (admin)/        — admin panel
  courses/[courseId]/  — public course detail page
  checkout/[courseId]/ — Stripe checkout
```

### Auth State (`apps/web/src/store/auth.store.ts`)
Zustand store persisted to localStorage:
- `useAuthStore()` — access `user`, `accessToken`, `isAuthenticated`
- Axios interceptor in `apps/web/src/lib/api.ts` auto-attaches Bearer token and handles 401 → token refresh → retry

### API Client
```ts
import { api, apiRoutes } from '@/lib/api';
// api is an axios instance pointing to NEXT_PUBLIC_API_URL || http://localhost:4000/api/v1
```
> Note: `NEXT_PUBLIC_API_URL` defaults to port **4000** in web/lib/api.ts but the API actually runs on **3001**. Set `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1` in `apps/web/.env.local`.

---

## Environment & Secrets

**All secrets live in `apps/api/.env`** (gitignored). The `ecosystem.config.js` loads it via `require('dotenv').config()` — never hardcode credentials there.

Key env vars:
```
DATABASE_URL, REDIS_HOST, JWT_SECRET, JWT_REFRESH_SECRET
SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM   ← Gmail App Password
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
MUX_TOKEN_ID, MUX_TOKEN_SECRET
FRONTEND_URL, ALLOWED_ORIGINS
ENCRYPTION_KEY  ← AES-256-GCM for MFA secrets at rest
```

---

## Database Schema

Schema: `packages/database/prisma/schema.prisma`

Key models: `User`, `Course`, `Section`, `Lesson`, `Enrollment`, `LessonProgress`, `Payment`, `Certificate`, `Quiz`, `Assignment`, `Community`, `Notification`, `Organization`, `PasswordReset`, `EmailVerification`, `Session` (refresh tokens), `AuditLog`.

`emailVerified DateTime?` on `User` — set when user clicks verification link.

---

## Email Verification Flow

1. `POST /auth/register` → creates user → sends email → returns `{ requiresVerification: true }`
2. Frontend redirects to `/check-email?email=...`
3. User clicks link → `GET /verify-email?token=...` → calls `POST /auth/verify-email`
4. API sets `emailVerified`, returns JWT → frontend logs user in → redirect to `/dashboard`
5. `POST /auth/resend-verification` — rate-limited to 3/hour

---

## Beta & Feature Flags

`apps/api/src/modules/beta/` — in-memory feature flags with deterministic rollout:
- `GET /beta/flags` — list flags
- `GET /beta/flags/:key/check?userId=` — check if enabled
- `PATCH /beta/flags/:key` — update rollout %
- `POST /beta/feedback` — submit user feedback (bug/feature/ux/performance/general)

Rollout: `hash(userId) % 100 < rolloutPct` — same user always gets same result.

---

## Security Posture

Current audit result: **20 PASS, 0 Critical, 0 High** (OWASP Top-10).

- Helmet with full CSP, HSTS (1yr + preload), referrer policy
- CORS strict allowlist from `ALLOWED_ORIGINS` env var
- `/metrics` endpoint restricted to localhost + internal Docker IPs (403 for external)
- `/health` uses `@SkipThrottle({ short: true, medium: true, long: true })` — never rate-limited
- No secrets committed — `.env` is gitignored, `ecosystem.config.js` reads from it

---

## pnpm Workspace Notes

`.npmrc` at root has `shamefully-hoist=true` — required for NestJS to find transitive deps like `express`. Without it the API fails at runtime with `MODULE_NOT_FOUND`.

When adding packages to the API:
```bash
cd apps/api && pnpm add <package>
```

---

## What's Left / Known TODOs

- `NEXT_PUBLIC_API_URL` in `apps/web` points to port 4000 by default — needs `.env.local` with port 3001
- Login does not currently block unverified users (no `emailVerified` check in `auth.service.ts login()`)
- Mobile app (`apps/mobile`) — Expo Router structure in place, not fully implemented
- OAuth (Google/GitHub) strategies require real `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` env vars
- Stripe, MUX, AWS are placeholder keys — real keys needed for payments/video/storage
