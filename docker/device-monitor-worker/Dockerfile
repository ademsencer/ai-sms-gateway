FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable pnpm
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY packages/ ./packages/
COPY apps/device-monitor-worker/ ./apps/device-monitor-worker/
RUN pnpm install --frozen-lockfile || pnpm install
RUN cd apps/device-monitor-worker && npx prisma generate
RUN cd packages/shared-types && pnpm build
RUN cd packages/shared-utils && pnpm build
RUN cd apps/device-monitor-worker && pnpm build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
WORKDIR /app

COPY --from=builder /app/apps/device-monitor-worker/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/device-monitor-worker/node_modules ./apps/device-monitor-worker/node_modules
COPY --from=builder /app/apps/device-monitor-worker/package.json ./package.json
COPY --from=builder /app/apps/device-monitor-worker/prisma ./prisma
COPY --from=builder /app/packages ./packages

USER nestjs

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
