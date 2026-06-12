FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm prisma@5.22.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --no-frozen-lockfile

COPY packages/database/ ./packages/database/
COPY apps/api/ ./apps/api/

RUN prisma generate --schema packages/database/prisma/schema.prisma

RUN npm install -g @nestjs/cli typescript && cd apps/api && npx tsc -p tsconfig.json || true

FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --no-frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
