FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl openssl-dev libc6-compat

RUN npm install -g prisma@5.22.0 @nestjs/cli typescript

# Copy all needed files
COPY packages/database/ ./packages/database/
COPY apps/api/ ./apps/api/

# Install deps in api directory
WORKDIR /app/apps/api
RUN npm install --legacy-peer-deps

# Generate Prisma client FROM api directory so client lands in api/node_modules
RUN prisma generate --schema /app/packages/database/prisma/schema.prisma

# Build
RUN npx tsc -p tsconfig.json || true

EXPOSE 3000
ENV PORT=3000
CMD ["node", "dist/main.js"]
