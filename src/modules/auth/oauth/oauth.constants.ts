/** Redis key: OAuth state 上下文 */
export const OAUTH_STATE_PREFIX = 'oauth:state:';

/** Redis key: OAuth 一次性交换码 */
export const OAUTH_EXCHANGE_PREFIX = 'oauth:exchange:';

/** NestJS DI token: Map<providerCode, OAuthProviderStrategy> */
export const OAUTH_PROVIDERS = Symbol('OAUTH_PROVIDERS');

/** 已注册的提供商 code 列表 */
export const SUPPORTED_PROVIDERS = ['google', 'github', 'gitee'] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];
