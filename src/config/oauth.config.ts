import { ConfigType, registerAs } from '@nestjs/config';

import { env, envNumber } from '~/global/env';

export const oauthRegToken = 'oauth';

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: readonly string[];
}

export interface IOauthConfig {
  frontendUrl: string;
  stateTtlSeconds: number;
  exchangeTtlSeconds: number;
  providers: {
    google: ProviderConfig | null;
    github: ProviderConfig | null;
    gitee: ProviderConfig | null;
  };
}

function buildProvider(
  prefix: string,
  scopes: readonly string[],
): ProviderConfig | null {
  const clientId = env(`${prefix}_CLIENT_ID`);
  const clientSecret = env(`${prefix}_CLIENT_SECRET`);
  const redirectUri = env(`${prefix}_REDIRECT_URI`);
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri, scopes };
}

export const OauthConfig = registerAs(
  oauthRegToken,
  (): IOauthConfig => ({
    frontendUrl: env('OAUTH_FRONTEND_URL', 'http://localhost:5173'),
    stateTtlSeconds: envNumber('OAUTH_STATE_TTL', 300),
    exchangeTtlSeconds: envNumber('OAUTH_EXCHANGE_TTL', 30),
    providers: {
      google: buildProvider('GOOGLE', ['openid', 'email', 'profile']),
      github: buildProvider('GITHUB', ['read:user', 'user:email']),
      gitee: buildProvider('GITEE', ['user_info']),
    },
  }),
);

export type IOauthConfigResolved = ConfigType<typeof OauthConfig>;
