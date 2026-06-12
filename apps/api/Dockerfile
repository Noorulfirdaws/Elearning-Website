FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace config and package manifests that exist
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/database/ ./packages/database/
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN npx prisma generate --schema packages/database/prisma/schema.prisma

# Build API
RUN cd apps/api && npx nest build

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
