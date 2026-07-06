import type { ProviderConfig } from '~/config/oauth.config';

import type { NormalizedOAuthUser } from '../oauth.types';
import { getJson, postJson } from '../oauth.utils';
import type { OAuthProviderStrategy } from './oauth-provider.interface';

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GoogleUserInfo {
  sub: string;
  name: string | null;
  email: string | null;
  picture: string | null;
}

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export class GoogleProvider implements OAuthProviderStrategy {
  readonly providerCode = 'google';
  readonly supportsPkce = true;

  constructor(private readonly config: ProviderConfig) {}

  getAuthorizationUrl(state: string, codeChallenge: string | null): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
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

    const tokenData = await postJson<GoogleTokenResponse>(TOKEN_URL, body);
    const userInfo = await getJson<GoogleUserInfo>(USERINFO_URL, {
      Authorization: `Bearer ${tokenData.access_token}`,
    });

    return {
      providerSubject: userInfo.sub,
      providerUsername: userInfo.name,
      providerEmail: userInfo.email,
      providerAvatar: userInfo.picture,
    };
  }
}
