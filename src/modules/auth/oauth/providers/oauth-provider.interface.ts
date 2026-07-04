import type { NormalizedOAuthUser } from '../oauth.types';

/**
 * OAuth 提供商策略接口，每个提供商实现此接口封装差异。
 */
export interface OAuthProviderStrategy {
  /** 提供商 code，如 'google' | 'github' | 'gitee' */
  readonly providerCode: string;

  /** 是否支持 PKCE（Gitee 不支持） */
  readonly supportsPkce: boolean;

  /**
   * 构造授权 URL。
   * @param state         CSRF 防护随机串
   * @param codeChallenge PKCE S256 challenge（supportsPkce=false 时忽略）
   */
  getAuthorizationUrl(state: string, codeChallenge: string | null): string;

  /**
   * 用 authorization code 换取 access_token，再请求 userinfo，归一化返回。
   * @param code        OAuth 回调收到的 authorization code
   * @param codeVerifier PKCE verifier（supportsPkce=false 时传 null）
   */
  exchangeCodeForUser(
    code: string,
    codeVerifier: string | null,
  ): Promise<NormalizedOAuthUser>;
}
