FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY packages/ ./packages/
COPY apps/dashboard/ ./apps/dashboard/
RUN pnpm install --frozen-lockfile || pnpm install
RUN cd packages/shared-types && pnpm build
RUN cd packages/shared-utils && pnpm build
RUN cd apps/dashboard && pnpm build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html
COPY docker/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
