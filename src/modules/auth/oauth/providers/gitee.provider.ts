import type { ProviderConfig } from '~/config/oauth.config';

import type { NormalizedOAuthUser } from '../oauth.types';
import { getJson, postJson } from '../oauth.utils';
import type { OAuthProviderStrategy } from './oauth-provider.interface';

interface GiteeTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GiteeUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const AUTHORIZE_URL = 'https://gitee.com/oauth/authorize';
const TOKEN_URL = 'https://gitee.com/oauth/token';
const USER_URL = 'https://gitee.com/api/v5/user';

export class GiteeProvider implements OAuthProviderStrategy {
  readonly providerCode = 'gitee';
  readonly supportsPkce = false;

  constructor(private readonly config: ProviderConfig) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });
    return `${AUTHORIZE_URL}?${params}`;
  }

  async exchangeCodeForUser(code: string): Promise<NormalizedOAuthUser> {
    const tokenData = await postJson<GiteeTokenResponse>(TOKEN_URL, {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    });

    // Gitee userinfo 通过 query 参数传 access_token
    const userInfo = await getJson<GiteeUserInfo>(
      `${USER_URL}?access_token=${encodeURIComponent(tokenData.access_token)}`,
    );

    return {
      providerSubject: String(userInfo.id),
      providerUsername: userInfo.login,
      providerEmail: userInfo.email,
      providerAvatar: userInfo.avatar_url,
    };
  }
}
