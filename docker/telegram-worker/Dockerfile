FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY apps/telegram-worker/package.json ./apps/telegram-worker/
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/shared-utils/node_modules ./packages/shared-utils/node_modules
COPY --from=deps /app/apps/telegram-worker/node_modules ./apps/telegram-worker/node_modules
COPY . .
RUN cd packages/shared-types && pnpm build
RUN cd packages/shared-utils && pnpm build
RUN cd apps/telegram-worker && pnpm build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/telegram-worker/dist ./dist
COPY --from=builder /app/apps/telegram-worker/node_modules ./node_modules
COPY --from=builder /app/apps/telegram-worker/package.json ./package.json
COPY --from=builder /app/packages/shared-types ./node_modules/@sms-gateway/shared-types
COPY --from=builder /app/packages/shared-utils ./node_modules/@sms-gateway/shared-utils

USER nestjs

CMD ["node", "dist/main"]
