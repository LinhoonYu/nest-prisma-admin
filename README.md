# nest-prisma-admin

基于 NestJS + Prisma + PostgreSQL 构建的企业级后台管理系统。

> **在线演示**：https://npa.ylhcode.top  
> 账号：`demo` / 密码：`123456`

集成 RBAC 权限、WebSocket 实时通知、RabbitMQ 消息队列、OAuth 第三方登录等能力，提供完整的中后台管理解决方案。

- 前端项目地址：[nest-prisma-admin-web](https://github.com/LinhoonYu/nest-prisma-admin-web)

## 项目特色

- **无过度封装**：基于 NestJS 官方最佳实践，结构清晰，易于上手和二次开发
- **权限系统完整**：用户/角色/菜单/权限/部门五位一体 RBAC，支持按钮级权限控制
- **通知模块**：支持即时/定时发布，RabbitMQ 延时队列 + WebSocket 实时推送，失败自动重试 + 死信队列
- **安全加固**：JWT + Refresh Token + RSA 密码加密传输 + 验证码 + 登录锁定
- **日志体系**：操作日志注解驱动 + 登录日志自动记录，RabbitMQ 异步写入不阻塞主流程
- **国际化**：后端 nestjs-i18n 中/英双语，前端 vue-i18n 对接
- **实时通信**：Socket.IO + Redis Adapter，支持多实例部署下的广播

## 技术栈

| 层级 | 技术 | 说明 |
|---|---|---|
| 后端框架 | NestJS 11 + Fastify | 高性能 HTTP 引擎 |
| ORM | Prisma 7 | 类型安全的数据库访问 |
| 数据库 | PostgreSQL 14+ | 主数据库 |
| 缓存 | Redis 6+ | 会话管理、验证码、WebSocket 适配器 |
| 消息队列 | RabbitMQ 3.12+ | 日志异步写入、通知定时推送 |
| 对象存储 | MinIO / S3 | 文件上传，预签名 URL |
| WebSocket | Socket.IO + Redis Adapter | 实时通知，多实例广播 |
| 认证 | JWT + Refresh Token | 双 Token 机制，支持多设备登录控制 |
| 密码加密 | RSA + bcrypt | 前端 RSA 加密传输，后端 bcrypt 存储 |
| 第三方登录 | Google / GitHub / Gitee | OAuth 2.0 |
| API 文档 | Swagger (OpenAPI 3) | 自动生成接口文档 |
| 日志 | Winston | 文件轮转 + 控制台 |
| 国际化 | nestjs-i18n | 中/英双语 |

## 功能模块

| 模块 | 功能 |
|---|---|
| 用户管理 | 用户 CRUD、头像上传、角色分配、数据权限（部门级） |
| 角色管理 | 角色 CRUD、权限分配、菜单分配 |
| 菜单管理 | 树形菜单、路由配置、图标选择 |
| 权限管理 | 细粒度按钮级权限（`sys:user:list`、`sys:role:create`…） |
| 部门管理 | 树形部门、数据权限范围控制 |
| 字典管理 | 字典类型 + 字典项，前端组件统一消费 |
| 系统配置 | 键值对配置管理 |
| 通知管理 | 即时/定时发布、WebSocket 推送、MQ 重试 + 死信队列 |
| 文件管理 | MinIO/S3 预签名上传 |
| 登录日志 | 登录记录、设备信息解析（MQ 异步写入） |
| 操作日志 | API 操作自动记录（注解驱动 + MQ 异步写入） |
| OAuth 登录 | Google / GitHub / Gitee 第三方登录与绑定 |
| 健康检查 | `/health`（存活）、`/health/ready`（就绪，检测 DB/Redis） |

## 环境要求

| 依赖 | 版本要求 | 说明 |
|---|---|---|
| Node.js | `>= 20.19.0`（推荐 22 LTS） | 前后端共用 |
| pnpm | `>= 9` | 包管理器，前后端均强制使用 |
| PostgreSQL | `>= 14` | 主数据库 |
| Redis | `>= 6` | 缓存、会话、WS 适配器 |
| RabbitMQ | `>= 3.12` | 消息队列，需安装 `rabbitmq_delayed_message_exchange` 插件 |
| MinIO | 任意版本 | 或任何 S3 兼容服务 |

> [!TIP]
> 如果你是新手，不太会搭建 PostgreSQL/Redis/RabbitMQ/MinIO，可以使用 Docker 快速启动这些服务，参考下方 [Docker 启动基础设施](#docker-启动基础设施) 章节。

## 快速开始

### 1. 获取项目代码

```bash
git clone https://github.com/LinhoonYu/nest-prisma-admin.git
cd nest-prisma-admin
```

### 2. 安装依赖

```bash
pnpm install
```

> 安装时会自动执行 `prisma generate` 生成 Prisma Client。

### 3. 配置环境变量

项目根目录已有 `.env` 文件，根据你的实际环境修改以下关键配置：

```env
# 应用配置
APP_PORT=3000
GLOBAL_PREFIX=api

# PostgreSQL
# 格式: postgresql://用户名:密码@主机:端口/数据库名
DATABASE_URL=postgresql://postgres:123456@localhost:5432/nest_prisma_admin?schema=public

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=123456
REDIS_DB=0

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT（生产环境务必修改）
JWT_SECRET=change-me-in-production-at-least-32-chars
JWT_EXPIRES_IN=2h

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=nest-prisma-admin

# 种子数据管理员密码
SEED_ADMIN_PASSWORD=admin123
```

完整的配置项说明见 `.env` 文件注释。

### 4. 初始化数据库

```bash
# 执行数据库迁移（创建表结构）
pnpm prisma:migrate

# 写入种子数据（超管账号、角色、菜单、权限、字典）
pnpm prisma:seed
```

种子数据包含：

| 数据 | 说明 |
|---|---|
| 超管账号 | `admin / admin123`（密码可通过 `SEED_ADMIN_PASSWORD` 配置） |
| 角色 | 超级管理员（拥有全部权限） |
| 菜单树 | 系统管理（用户/角色/菜单/权限/部门/字典/配置/通知/日志） |
| 字典数据 | 通知类型、通知等级等 |

### 5. 启动后端服务

```bash
pnpm start:dev
```

启动成功后可访问：

| 服务 | 地址 |
|---|---|
| API 服务 | `http://localhost:3000/api/v1` |
| Swagger 文档 | `http://localhost:3000/api-docs` |
| 健康检查 | `http://localhost:3000/health/ready` |

### 6. 启动前端项目

前端项目在单独的仓库 [nest-prisma-admin-web](https://github.com/LinhoonYu/nest-prisma-admin-web)：

```bash
git clone https://github.com/LinhoonYu/nest-prisma-admin-web.git
cd nest-prisma-admin-web
pnpm install
pnpm dev
```

前端访问地址：`http://localhost:5173`

默认登录账号：

| 账号 | 密码 | 权限 |
|---|---|---|
| admin | admin123 | 超级管理员 |

## Docker 启动基础设施

如果你本地没有 PostgreSQL/Redis/RabbitMQ/MinIO，可以使用 Docker 快速启动：

```bash
# PostgreSQL
docker run -d --name postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=123456 \
  -e POSTGRES_DB=nest_prisma_admin \
  postgres:16-alpine

# Redis
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine redis-server --requirepass 123456

# MinIO
docker run -d --name minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# RabbitMQ（含管理界面）
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3.13-management
```

### RabbitMQ 延时插件安装

通知模块的定时发布功能依赖 `rabbitmq_delayed_message_exchange` 插件，**必须安装**否则项目启动会报错：

```bash
# 下载插件到 RabbitMQ plugins 目录
docker exec rabbitmq sh -c \
  "wget -P /opt/rabbitmq/plugins https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/3.13.0/rabbitmq_delayed_message_exchange-3.13.0.ez"

# 启用插件并重启
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_delayed_message_exchange
docker restart rabbitmq
```

> [!IMPORTANT]
> 插件文件权限需为 `644`，否则 RabbitMQ 进程无法加载。如果启用后仍报 `unknown exchange type 'x-delayed-message'`，执行 `docker exec rabbitmq chmod 644 /opt/rabbitmq/plugins/rabbitmq_delayed_message_exchange-*.ez` 后重启。

验证插件是否生效：

```bash
docker exec rabbitmq rabbitmq-plugins list | grep delayed
# 输出应包含 [E*] rabbitmq_delayed_message_exchange
```

## 本地开发

```bash
# 开发模式（热重载）
pnpm start:dev

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format

# ESLint 检查 + 自动修复
pnpm lint

# 交互式提交（Conventional Commits）
pnpm commit
```

## 数据库管理

```bash
# 修改 schema.prisma 后，生成并应用迁移
pnpm prisma:migrate

# 生产环境部署迁移（仅应用，不生成新迁移）
pnpm prisma:migrate:prod

# 重新生成 Prisma Client（修改 schema 后）
pnpm prisma:generate

# 写入种子数据
pnpm prisma:seed

# 打开 Prisma Studio（可视化查看/编辑数据）
pnpm prisma:studio

# 重置数据库（删除所有数据 + 重新迁移 + 种子）
pnpm db:reset
```

> [!TIP]
> 修改 `prisma/schema.prisma` 后，执行 `pnpm prisma:migrate` 会自动生成迁移文件并应用。迁移文件位于 `prisma/migrations/` 目录，需要提交到 Git。

## Docker 部署

项目提供多阶段构建的 `Dockerfile`：

```bash
# 构建镜像
docker build -t nest-prisma-admin .

# 运行容器
docker run -d \
  --name nest-prisma-admin \
  -p 3000:3000 \
  --env-file .env \
  nest-prisma-admin
```

生产环境首次部署需先执行数据库迁移：

```bash
# 方式一：在容器内执行
docker exec nest-prisma-admin node -e \
  "require('prisma').PrismaClient; require('child_process').execSync('npx prisma migrate deploy', {stdio: 'inherit'})"

# 方式二：在本地执行（需能连通数据库）
pnpm prisma:migrate:prod
```

## 常用脚本

| 命令 | 说明 |
|---|---|
| `pnpm start:dev` | 开发模式（热重载） |
| `pnpm start:prod` | 生产模式（需先 `pnpm build`） |
| `pnpm build` | 编译 TypeScript |
| `pnpm typecheck` | 类型检查（不输出文件） |
| `pnpm lint` | ESLint 代码检查 + 自动修复 |
| `pnpm format` | Prettier 格式化 |
| `pnpm test` | 单元测试 |
| `pnpm test:e2e` | E2E 测试 |
| `pnpm test:cov` | 测试覆盖率 |
| `pnpm prisma:migrate` | 生成并应用数据库迁移 |
| `pnpm prisma:migrate:prod` | 生产环境迁移（仅应用） |
| `pnpm prisma:generate` | 生成 Prisma Client |
| `pnpm prisma:seed` | 写入种子数据 |
| `pnpm prisma:studio` | Prisma Studio 可视化工具 |
| `pnpm db:reset` | 重置数据库 |
| `pnpm commit` | 交互式 Conventional Commit |

## 项目结构

```
nest-prisma-admin/
├── prisma/
│   ├── schema.prisma                # 数据模型定义
│   ├── migrations/                  # 数据库迁移文件
│   └── seed.ts                      # 种子数据脚本
├── src/
│   ├── common/                      # 公共模块
│   │   ├── decorators/              #   装饰器（@Perm、@CurrentUser 等）
│   │   ├── dto/                     #   基础 DTO（分页、ID 参数）
│   │   ├── exceptions/              #   异常 + 错误码定义
│   │   ├── filters/                 #   全局异常过滤器
│   │   ├── interceptors/            #   响应转换拦截器
│   │   ├── logger/                  #   日志封装
│   │   └── utils/                   #   工具函数
│   ├── config/                      # 配置注册（app/security/rabbitmq/storage...）
│   ├── generated/prisma/            # Prisma 自动生成（勿手动修改）
│   ├── global/                      # 全局模块（env、health）
│   ├── i18n/                        # 国际化资源（zh-CN/en）
│   ├── modules/
│   │   ├── auth/                    # 认证（登录/刷新/验证码/RSA/OAuth/会话）
│   │   ├── config/                  # 系统配置管理
│   │   ├── dict/                    # 字典管理（类型 + 项）
│   │   ├── file/                    # 文件上传（S3 预签名）
│   │   ├── iam/                     # 身份与访问管理
│   │   │   ├── dept/                #   部门管理
│   │   │   ├── menu/                #   菜单管理
│   │   │   ├── permission/          #   权限管理
│   │   │   ├── role/                #   角色管理
│   │   │   └── user/                #   用户管理
│   │   ├── log/                     # 日志模块
│   │   │   ├── login-log/           #   登录日志（MQ 异步写入）
│   │   │   └── operation-log/       #   操作日志（注解 + MQ 异步写入）
│   │   ├── notice/                  # 通知模块（即时/定时发布、WS 推送、MQ 重试）
│   │   └── ws/                      # WebSocket 网关（Redis 多实例适配器）
│   ├── shared/                      # 基础设施层
│   │   ├── prisma/                  #   Prisma 服务封装
│   │   ├── rabbitmq/                #   RabbitMQ 模块配置
│   │   ├── redis/                   #   Redis 服务封装
│   │   └── s3/                      #   S3 客户端封装
│   ├── app.module.ts                # 根模块
│   └── main.ts                      # 应用入口
├── Dockerfile                       # 多阶段构建
├── .env                             # 环境变量
└── package.json
```

## 环境变量说明

| 变量 | 默认值 | 说明 |
|---|---|---|
| `NODE_ENV` | `development` | 运行环境 |
| `APP_PORT` | `3000` | 应用端口 |
| `GLOBAL_PREFIX` | `api` | 全局路由前缀 |
| `MULTI_DEVICE_LOGIN` | `false` | 是否允许多设备同时登录 |
| `DATABASE_URL` | — | PostgreSQL 连接字符串 |
| `REDIS_HOST` | `127.0.0.1` | Redis 主机 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | — | Redis 密码 |
| `REDIS_DB` | `0` | Redis 数据库编号 |
| `RABBITMQ_URL` | — | RabbitMQ 连接字符串 |
| `SWAGGER_ENABLE` | `true` | 是否启用 Swagger |
| `SWAGGER_PATH` | `api-docs` | Swagger 文档路径 |
| `JWT_SECRET` | — | JWT 密钥（**必填**） |
| `JWT_EXPIRES_IN` | `2h` | Access Token 过期时间 |
| `REFRESH_EXPIRES_IN` | `7d` | Refresh Token 过期时间 |
| `CAPTCHA_ENABLE` | `true` | 是否启用验证码 |
| `RSA_ENABLE` | `true` | 是否启用 RSA 密码加密 |
| `S3_ENDPOINT` | `http://localhost:9000` | S3/MinIO 端点 |
| `S3_ACCESS_KEY` | `minioadmin` | S3 Access Key |
| `S3_SECRET_KEY` | `minioadmin` | S3 Secret Key |
| `S3_BUCKET` | `nest-prisma-admin` | S3 桶名 |
| `S3_MAX_FILE_SIZE` | `50` | 最大文件大小（MB） |
| `SEED_ADMIN_PASSWORD` | `admin123` | 种子数据管理员密码 |
| `HTTPS_PROXY` | — | OAuth 代理地址（国内访问 Google/GitHub 需要） |

## 通知模块架构

通知模块是本项目的核心亮点，集成了 RabbitMQ 延时队列实现定时发布：

```
草稿(0) ──发布──► 定时发布中(2) ──MQ到期──► 已发布(1) + publishTime + WS推送
                     │                        │
                     ├──撤回──► 已撤回(-1)     ├──失败──► 自动重试(1min/5min/15min)
                     │                        │
                     └── 重试 ──► 重新发MQ     └──3次失败──► 死信队列(DLQ)
```

- **即时发布**：直接 WS 推送，MQ 不可用时降级为直推
- **定时发布**：MQ 延时消息，到期后自动推送，`publishTime` 为实际推送时间
- **失败重试**：阶梯延时（1min → 5min → 15min），3 次后进入死信队列
- **过期机制**：`expireDays` 过期后不再推送
- **幂等保证**：并发场景下通过条件更新避免重复推送

## 欢迎 Star && PR

**如果项目有帮助到你可以点个 Star 支持下。有更好的实现欢迎 PR。**

## License

[MIT](LICENSE)
