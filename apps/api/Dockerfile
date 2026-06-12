FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm prisma@5.22.0 @nestjs/cli typescript

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --no-frozen-lockfile

COPY packages/database/ ./packages/database/
COPY apps/api/ ./apps/api/

RUN prisma generate --schema packages/database/prisma/schema.prisma

RUN cd apps/api && npx tsc -p tsconfig.json || true

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
