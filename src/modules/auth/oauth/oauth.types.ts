/** 所有 OAuth 提供商归一化后的用户信息 */
export interface NormalizedOAuthUser {
  /** 提供商唯一标识（Google sub / GitHub id / Gitee id），统一为 string */
  providerSubject: string;
  providerUsername: string | null;
  providerEmail: string | null;
  providerAvatar: string | null;
  /** 提供商返回的原始用户信息 */
  rawProfile: Record<string, unknown>;
}

/** Redis 中 state → 上下文 */
export interface OAuthStateContext {
  providerCode: string;
  /** PKCE code_verifier，不支持 PKCE 时为 null */
  codeVerifier: string | null;
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
