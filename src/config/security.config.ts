import { ConfigType, registerAs } from '@nestjs/config';

import { env, envNumber } from '~/global/env';

export const securityRegToken = 'security';

export const SecurityConfig = registerAs(securityRegToken, () => {
  const secret = env('JWT_SECRET');

  if (!secret) {
    throw new Error(
      'JWT_SECRET is required — set it in .env or environment variables',
    );
  }

  return {
    jwt: {
      secret,
      expiresIn: env('JWT_EXPIRES_IN', '15m'),
      issuer: env('JWT_ISSUER', 'nest-prisma-admin'),
      audience: env('JWT_AUDIENCE', 'nest-prisma-admin-client'),
    },
    refresh: {
      expiresIn: env('REFRESH_EXPIRES_IN', '7d'),
      ttlDays: envNumber('REFRESH_TTL_DAYS', 30),
    },
    captcha: {
      expiresIn: envNumber('CAPTCHA_EXPIRES_IN', 5), // minutes
      length: envNumber('CAPTCHA_LENGTH', 4),
    },
    lock: {
      threshold: envNumber('LOCK_THRESHOLD', 5),
      duration: envNumber('LOCK_DURATION', 15), // minutes
    },
  };
});

export type ISecurityConfig = ConfigType<typeof SecurityConfig>;
