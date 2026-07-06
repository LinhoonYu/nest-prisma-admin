/** 所有 OAuth 提供商归一化后的用户信息 */
export interface NormalizedOAuthUser {
  /** 提供商唯一标识（Google sub / GitHub id / Gitee id），统一为 string */
  providerSubject: string;
  providerUsername: string | null;
  providerEmail: string | null;
  providerAvatar: string | null;
  /** 渠道特定数据（如微信 openid/unionid），当前提供商不需要时留空 */
  providerMetadata?: Record<string, unknown>;
}

/** Redis 中 state → 上下文 */
export interface OAuthStateContext {
  providerCode: string;
  /** PKCE code_verifier，不支持 PKCE 时为 null */
  codeVerifier: string | null;
  /** login=OAuth 登录, bind=已登录用户绑定第三方账号 */
  mode: 'login' | 'bind';
}

/** Redis 中一次性交换码 → Token 结果 */
export interface OAuthExchangePayload {
  accessToken: string;
  refreshToken: string;
}

/** GET /auth/oauth/:provider/auth-url 响应 */
export interface AuthUrlResponse {
  url: string;
}

/** OAuth 登录结果 */
export interface OAuthLoginResult {
  accessToken: string;
  refreshToken: string;
}

/** Redis 中首次登录待处理上下文 */
export interface OAuthPendingPayload {
  providerCode: string;
  normalized: NormalizedOAuthUser;
}
