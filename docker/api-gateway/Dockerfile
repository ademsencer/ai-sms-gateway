FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable pnpm
WORKDIR /app

# Copy everything and install all deps in one go
FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api-gateway/ ./apps/api-gateway/
RUN pnpm install --frozen-lockfile || pnpm install
RUN cd apps/api-gateway && npx prisma generate
RUN cd packages/shared-types && pnpm build
RUN cd packages/shared-utils && pnpm build
RUN cd apps/api-gateway && pnpm build

# Production stage
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
WORKDIR /app

# Copy built app and all node_modules (preserving workspace structure)
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway/node_modules ./apps/api-gateway/node_modules
COPY --from=builder /app/apps/api-gateway/package.json ./package.json
COPY --from=builder /app/apps/api-gateway/prisma ./prisma
COPY --from=builder /app/packages ./packages

USER nestjs
EXPOSE 3005

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
