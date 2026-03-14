FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable pnpm
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY apps/api-gateway/prisma ./apps/api-gateway/prisma/
RUN pnpm install --frozen-lockfile || pnpm install
RUN cd apps/api-gateway && npx prisma generate

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/shared-utils/node_modules ./packages/shared-utils/node_modules
COPY --from=deps /app/apps/api-gateway/node_modules ./apps/api-gateway/node_modules
COPY . .
RUN cd packages/shared-types && pnpm build
RUN cd packages/shared-utils && pnpm build
RUN cd apps/api-gateway && pnpm build

# Production stage
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway/package.json ./package.json
COPY --from=builder /app/apps/api-gateway/prisma ./prisma
COPY --from=builder /app/packages/shared-types ./node_modules/@sms-gateway/shared-types
COPY --from=builder /app/packages/shared-utils ./node_modules/@sms-gateway/shared-utils

USER nestjs
EXPOSE 3005

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
