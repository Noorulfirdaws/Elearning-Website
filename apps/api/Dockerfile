FROM node:20-alpine
WORKDIR /app

RUN npm install -g prisma@5.22.0 @nestjs/cli typescript

# Copy all needed files
COPY packages/database/ ./packages/database/
COPY apps/api/ ./apps/api/
COPY package.json ./

# Install deps using npm (flat node_modules, no hoisting issues)
WORKDIR /app/apps/api
RUN npm install --legacy-peer-deps

# Generate Prisma client
WORKDIR /app
RUN prisma generate --schema packages/database/prisma/schema.prisma

# Build
WORKDIR /app/apps/api
RUN npx tsc -p tsconfig.json || true

EXPOSE 3000
CMD ["node", "dist/main.js"]
