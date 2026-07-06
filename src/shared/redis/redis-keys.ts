/**
 * Redis key 集中定义。
 * 所有业务模块的 Redis key 都在这里声明，方便统一排查和管理。
 * RedisService 会自动加 "npa:" 前缀，这里只需写业务段。
 */

// ---- Session ----

/** 会话有效性标记，EXISTS 即表示会话活跃，DEL 即表示撤销 */
export const sessionKey = (sessionId: string) => `session:${sessionId}`;

/** 用户的活跃 session 集合（SET），用于多端管理和互踢 */
export const userSessionsKey = (userId: string) => `user:sessions:${userId}`;

// ---- Refresh Token ----

/** 刷新令牌存储，值为 { userId, sessionId, status } */
export const refreshTokenKey = (tokenHash: string) => `rt:${tokenHash}`;

// ---- 用户上下文缓存 ----

/** 用户基本信息缓存 */
export const userCacheKey = (userId: string) => `user:${userId}`;

/** 用户角色 codes 缓存 */
export const userRolesCacheKey = (userId: string) => `user:roles:${userId}`;

/** 用户权限 codes 缓存 */
export const userPermsCacheKey = (userId: string) => `user:perms:${userId}`;

// ---- 验证码 ----

/** 图形验证码答案 */
export const captchaKey = (key: string) => `captcha:${key}`;

// ---- OAuth ----

/** OAuth state 上下文 */
export const oauthStateKey = (state: string) => `oauth:state:${state}`;

/** OAuth 一次性交换码 */
export const oauthExchangeKey = (code: string) => `oauth:exchange:${code}`;

/** OAuth 首次登录待处理上下文 */
export const oauthPendingKey = (code: string) => `oauth:pending:${code}`;

// ---- 系统配置 ----

/** 系统配置值缓存 */
export const configValueKey = (key: string) => `config:value:${key}`;
