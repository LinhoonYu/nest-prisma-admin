# syntax=docker/dockerfile:1

# Builder：装依赖 + prisma generate + 编译
FROM node:20-alpine AS builder
RUN apk add --no-cache git \
 && corepack enable \
 && corepack prepare pnpm@latest --activate

WORKDIR /app

# 先拷依赖清单和 schema，利用层缓存；postinstall 依赖 schema 在场
COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma

# 跳过 husky prepare（Docker 内无 .git）
ENV HUSKY=0
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm prune --prod

# Runner：最小运行镜像
FROM node:20-alpine AS runner
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app
ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --timeout=3 --spider http://localhost:3000/health/ready || exit 1

CMD ["node", "dist/main.js"]
