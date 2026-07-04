import type { ProviderConfig } from '~/config/oauth.config';

import type { NormalizedOAuthUser } from '../oauth.types';
import { getJson, postJson } from '../oauth.utils';
import type { OAuthProviderStrategy } from './oauth-provider.interface';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const EMAILS_URL = 'https://api.github.com/user/emails';

export class GitHubProvider implements OAuthProviderStrategy {
  readonly providerCode = 'github';
  readonly supportsPkce = true;

  constructor(private readonly config: ProviderConfig) {}

  getAuthorizationUrl(state: string, codeChallenge: string | null): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
    });
    if (codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }
    return `${AUTHORIZE_URL}?${params}`;
  }

  async exchangeCodeForUser(
    code: string,
    codeVerifier: string | null,
  ): Promise<NormalizedOAuthUser> {
    const body: Record<string, string> = {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    };
    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    // GitHub token endpoint 必须加 Accept: application/json
    const tokenData = await postJson<GitHubTokenResponse>(TOKEN_URL, body, {
      Accept: 'application/json',
    });

    const authHeader = {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'nest-prisma-admin',
    };
    const userInfo = await getJson<GitHubUserInfo>(USER_URL, authHeader);

    // GitHub 用户设了私密邮箱时 /user 返回 email: null，需额外请求
    let email = userInfo.email;
    if (!email) {
      const emails = await getJson<GitHubEmail[]>(EMAILS_URL, authHeader);
      const primary = emails.find((e) => e.primary);
      email = primary?.email ?? null;
    }

    return {
      providerSubject: String(userInfo.id),
      providerUsername: userInfo.login,
      providerEmail: email,
      providerAvatar: userInfo.avatar_url,
      rawProfile: userInfo as unknown as Record<string, unknown>,
    };
  }
}
