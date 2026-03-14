FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY apps/sms-worker/package.json ./apps/sms-worker/
COPY apps/sms-worker/prisma ./apps/sms-worker/prisma/
RUN pnpm install --frozen-lockfile || pnpm install
RUN cd apps/sms-worker && npx prisma generate

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/shared-utils/node_modules ./packages/shared-utils/node_modules
COPY --from=deps /app/apps/sms-worker/node_modules ./apps/sms-worker/node_modules
COPY . .
RUN cd apps/sms-worker && pnpm build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/sms-worker/dist ./dist
COPY --from=builder /app/apps/sms-worker/node_modules ./node_modules
COPY --from=builder /app/apps/sms-worker/package.json ./package.json
COPY --from=builder /app/apps/sms-worker/prisma ./prisma

USER nestjs

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
