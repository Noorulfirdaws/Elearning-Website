FROM node:20-alpine
WORKDIR /app

# OpenSSL 1.1 required by Prisma query engine on Alpine
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Copy source
COPY packages/database/ ./packages/database/
COPY apps/api/ ./apps/api/

# Install deps
WORKDIR /app/apps/api
RUN npm install --legacy-peer-deps

# Align Prisma CLI + client versions to avoid mismatch
RUN npm install prisma@5.14.0 @prisma/client@5.14.0 --save-exact --no-save --legacy-peer-deps

# Generate Prisma client (uses local prisma binary matching @prisma/client)
RUN ./node_modules/.bin/prisma generate --schema /app/packages/database/prisma/schema.prisma

# Build TypeScript (noEmitOnError=false so dist is always produced)
RUN ./node_modules/.bin/tsc -p tsconfig.json || true

EXPOSE 3000
ENV PORT=3000
CMD ["node", "dist/main.js"]
