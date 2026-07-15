# syntax=docker/dockerfile:1

# Builder：装依赖 + prisma generate + 编译
FROM node:20-alpine AS builder
RUN apk add --no-cache git \
 && corepack enable \
 && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma

ENV HUSKY=0
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Runner：最小运行镜像
FROM node:20-alpine AS runner
RUN apk add --no-cache wget \
 && corepack enable \
 && corepack prepare pnpm@10 --activate
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

# 拷贝编译产物和依赖清单
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=app:app /app/.npmrc ./.npmrc
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --chown=app:app docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# 生成纯 JS 版 prisma 配置（生产环境不需要 tsx 和 dotenv）
RUN printf 'import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: "prisma/schema.prisma", migrations: { path: "prisma/migrations" }, datasource: { url: process.env.DATABASE_URL } });\n' > prisma.config.mjs

# 干净安装生产依赖，预下载 prisma 引擎，修正文件权限
ENV HUSKY=0
RUN pnpm install --prod --frozen-lockfile --ignore-scripts \
 && ./node_modules/.bin/prisma generate \
 && pnpm store prune \
 && chown -R app:app /app

USER app
ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --timeout=3 --spider http://localhost:3000/health/ready || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
