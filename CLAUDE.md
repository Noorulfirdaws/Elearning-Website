# CLAUDE.md — LearnHub LMS Platform

This file provides full context for Claude Code when resuming work on this project.

---

## Project Overview

Full-stack **Learning Management System (LMS)** — production-ready monorepo.

| App | Tech | Port |
|---|---|---|
| `apps/api` | NestJS 10 + Prisma + PostgreSQL | 3001 |
| `apps/web` | Next.js 14 App Router | 3000 |
| `apps/mobile` | React Native / Expo | 8081 |
| `packages/database` | Prisma schema (shared) | — |
| `packages/shared` | TypeScript types | — |

**Package manager:** pnpm workspaces + Turborepo. Node ≥ 20, pnpm ≥ 9.

---

## GitHub Repository

**URL:** https://github.com/Noorulfirdaws/Elearning-Website  
**Branch:** `main`  
**Owner:** noorulfirdaws@gmail.com

---

## Quick Start (Resume Work)

```bash
# 1. API is managed by pm2 — check if running
pm2 status
pm2 start apps/api/ecosystem.config.js   # if not running
pm2 logs lms-api --lines 30 --nostream   # check for errors

# 2. Web frontend
cd apps/web && pnpm dev   # http://localhost:3000

# 3. Database already exists — no migration needed
# Connection: postgresql://lms:lmspassword@localhost:5432/lmsdb
```

---

## Test Accounts (Already in DB)

| Role | Email | Password |
|---|---|---|
| Instructor | cabdikarimcaligeydh@gmail.com | Instructor123! |
| Instructor | noorulfirdaws@gmail.com | Instructor123! |
| Student | student@learnhub.com | Student123! |

---

## What Is Fully Working ✅

- **Auth**: login, register, email verification, JWT refresh
- **Instructor**: dashboard, create course, course builder (sections/lessons)
- **Lesson editor**: title, description, type, duration, YouTube URL with preview, free preview toggle
- **AI course generation**: Claude API (`claude-opus-4-5`) generates full outline → creates sections + lessons + updates course fields. Bulletproof with type normalization and error handling.
- **Course catalog**: search, filter by level, sort
- **Course detail page**: enroll button, curriculum, instructor info
- **Student enrollment**: free courses (409 handled gracefully)
- **Course player**: YouTube embed + native HLS, progress tracking, lesson navigation, AI tutor chat
- **Home page**: shows real published courses from DB
- **Featured courses**: live from `/courses/featured` API

---

## What Is PARKED (do later) 🅿️

| # | Feature | Notes |
|---|---|---|
| 1 | **Payments / Stripe** | Keys are placeholders in `.env`. Endpoint exists at `POST /payments/stripe/checkout`. |
| 2 | **Video upload** | MUX/S3 keys are placeholders. Currently YouTube links only. |
| 3 | **SMTP email delivery** | Code works. Needs real Gmail App Password in `apps/api/.env` (`SMTP_PASS`). |
| 4 | **Course thumbnail upload** | No image upload UI. Can paste URLs manually in settings. |
| 5 | **Certificates** | API endpoint exists. Not tested end-to-end. |
| 6 | **Quiz builder UI** | API fully built. No instructor UI to create quizzes. |
| 7 | **Assignment submission** | API built. No student/instructor UI. |
| 8 | **Meilisearch / Search** | Container needs to run + index courses. |
| 9 | **Instructor analytics** | Page exists, needs real DB aggregations. |
| 10 | **Course reviews UI** | API exists (`POST /courses/:id/reviews`). No UI. |
| 11 | **Mobile app** | Expo structure complete. Needs same WiFi to test with Expo Go. |
| 12 | **OAuth (Google/GitHub)** | Needs real `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID`. |
| 13 | **Admin panel** | Page skeleton at `/admin`. Not wired to API. |

---

## Key Environment File

**Location:** `apps/api/.env` (gitignored — never commit)

Critical vars:
```
DATABASE_URL=postgresql://lms:lmspassword@localhost:5432/lmsdb?schema=public
ANTHROPIC_API_KEY=sk-ant-api03-...   ← already set, credits purchased
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SMTP_HOST=smtp.gmail.com
SMTP_USER=...
SMTP_PASS=...   ← needs real Gmail App Password
FRONTEND_URL=http://localhost:3000
```

---

## Essential Commands

### API
```bash
pm2 start apps/api/ecosystem.config.js    # start
pm2 restart lms-api                        # restart after code changes
pm2 logs lms-api --lines 50 --nostream    # view logs
pm2 stop lms-api                           # stop
```

### Database
```bash
# Schema: packages/database/prisma/schema.prisma
# Push schema changes (no migration files)
DATABASE_URL="postgresql://lms:lmspassword@localhost:5432/lmsdb?schema=public" \
  npx prisma db push --schema packages/database/prisma/schema.prisma

# Regenerate Prisma client (must kill pm2 first on Windows — DLL lock)
pm2 stop lms-api
DATABASE_URL="..." npx prisma generate --schema packages/database/prisma/schema.prisma
pm2 start apps/api/ecosystem.config.js
```

### Frontend
```bash
cd apps/web && pnpm dev        # http://localhost:3000
cd apps/mobile && npx expo start
```

---

## Architecture Notes

### API Pattern
- **Global `JwtAuthGuard`** — all routes need JWT by default
- **`@Public()`** — skips JWT (login, register, etc.)
- **`TransformInterceptor`** — all responses: `{ success, data, timestamp }`
- **Three throttler tiers**: short (10/s), medium (50/10s), long (200/min)
- **`@SkipThrottle({ short: true, medium: true, long: true })`** — skip all 3

### Database Schema Key Points
- `sections` and `lessons` use `position` (NOT `order`) for ordering
- `questions` use `position` (NOT `order`)
- `learning_path_steps` use `order`
- `lessons` has NO `deletedAt` column — use `isPublished: false` for soft delete
- `courses` has `deletedAt` and `outcomes` (NOT `whatYoullLearn`)
- `users` password field is `passwordHash` (NOT `password`)

### Frontend Key Points
- **API base URL**: `http://localhost:3001/api/v1` (set in `apps/web/.env.local`)
- **Auth store**: Zustand persisted to localStorage (`useAuthStore`)
- **Axios interceptor**: auto-attaches Bearer token, handles 401 → refresh → retry
- **Course detail**: `/courses/[courseId]` where `courseId` is the **slug**
- **Course player**: `/dashboard/courses/[courseId]/learn/[lessonId]` where `courseId` is the **UUID**

### AI Generation (Anthropic)
- Model: `claude-opus-4-5`, max_tokens: 4096
- Endpoint: `POST /ai/course-outline` with `{ topic, level, targetAudience }`
- Returns: `{ title, subtitle, description, outcomes, requirements, sections: [{ title, lessons: [{ title, type, description, estimatedMinutes }] }] }`
- Lesson types normalized: AI output → valid enum (VIDEO, TEXT, DOCUMENT, EMBED, LIVE, QUIZ, ASSIGNMENT)

---

## Folder Structure (Key Files)

```
apps/api/src/modules/
  ai/            — Anthropic integration (course outline, quiz, tutor chat)
  auth/          — JWT, register, login, email verify, refresh
  courses/       — CRUD, publish, featured, instructor endpoint
  sections/      — Section CRUD (position-based ordering)
  lessons/       — Lesson CRUD (position-based ordering)
  enrollments/   — Free enrollment, my-enrollments
  progress/      — Lesson progress, course progress
  payments/      — Stripe (placeholder)
  certificates/  — Certificate generation (placeholder)
  users/         — Profile, password change

apps/web/src/app/
  (auth)/        — login, register, verify-email, forgot-password
  (dashboard)/   — student dashboard, course player (/dashboard/courses/[id]/learn/[lessonId])
  (instructor)/  — instructor dashboard, course builder, lesson editor
  courses/[courseId]/  — public course detail (slug-based)
  catalog/       — course catalog with search+filter
  page.tsx       — home page with real featured courses

apps/web/src/components/
  player/video-player.tsx   — auto-detects YouTube vs native HLS
  course/featured-courses.tsx — fetches from /courses/featured API
  layout/navbar.tsx, hero-section.tsx, footer.tsx
```

---

## Git History (Recent)
```
dc3ea4e fix: lesson editor page + bulletproof AI generation + PATCH course endpoint
8753eab fix: remove isFree from lesson select in progress service
02c27d8 fix: connect featured courses to API and fix course detail field names
f9fa454 fix: resolve course builder, AI generation and schema mismatches
66c1d93 feat: add YouTube embed support for web and mobile video player
aea30ef feat: complete all 5 priority fixes
d6ebe0b docs: add CLAUDE.md for AI-assisted development context
```

---

## Security Notes
- `.env` is gitignored — secrets never committed
- Anthropic API key is in `apps/api/.env` only
- Two GitHub PATs were previously exposed in chat and must remain revoked
- CORS restricted to `ALLOWED_ORIGINS` env var
- `/metrics` restricted to localhost

---

*Last updated: 2026-06-09 — Project parked. Core LMS is functional. Resume when ready.*
