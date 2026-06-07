# LMS Platform — Quick Start

## Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

## 1. Install dependencies

```bash
npm install -g pnpm
pnpm install
```

## 2. Start infrastructure (Postgres, Redis, Meilisearch)

```bash
docker-compose up -d postgres redis meilisearch
```

## 3. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your values
```

## 4. Generate Prisma client & push schema

```bash
pnpm run db:generate
pnpm run db:push
```

## 5. Seed the database

```bash
pnpm run db:seed
```

**Test accounts created:**
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@lms.dev | Admin@123456 |
| Instructor | instructor@lms.dev | Instructor@123 |
| Student | student@lms.dev | Student@123 |

## 6. Start development servers

```bash
pnpm dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **API Docs (Swagger):** http://localhost:4000/api/docs

## 7. Full Docker stack

```bash
docker-compose up --build
```

---

## Project Structure

```
lms-platform/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js 14 frontend
├── packages/
│   └── database/     # Prisma schema + seed
├── docker/           # Nginx config
├── k8s/              # Kubernetes manifests
└── .github/          # CI/CD workflows
```

## Key URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:4000 |
| Swagger | http://localhost:4000/api/docs |
| Meilisearch | http://localhost:7700 |

## Environment Variables

All variables documented in `.env.example`. Required for production:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` + `JWT_REFRESH_SECRET` — Generate with `openssl rand -hex 64`
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_S3_BUCKET`
- OAuth: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
