FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable pnpm
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY packages/ ./packages/
COPY apps/sms-worker/ ./apps/sms-worker/
RUN pnpm install --frozen-lockfile || pnpm install
RUN cd apps/sms-worker && npx prisma generate
RUN cd packages/shared-types && pnpm build
RUN cd packages/shared-utils && pnpm build
RUN cd apps/sms-worker && pnpm build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
WORKDIR /app

COPY --from=builder /app/apps/sms-worker/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/sms-worker/node_modules ./apps/sms-worker/node_modules
COPY --from=builder /app/apps/sms-worker/package.json ./package.json
COPY --from=builder /app/apps/sms-worker/prisma ./prisma
COPY --from=builder /app/packages ./packages

USER nestjs

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
