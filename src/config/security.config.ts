import { ConfigType, registerAs } from '@nestjs/config';

import { env, envBoolean, envNumber } from '~/global/env';

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
    },
    captcha: {
      enabled: envBoolean('CAPTCHA_ENABLE', true),
      expiresIn: envNumber('CAPTCHA_EXPIRES_IN', 5), // minutes
      length: envNumber('CAPTCHA_LENGTH', 4),
    },
    lock: {
      threshold: envNumber('LOCK_THRESHOLD', 5),
      duration: envNumber('LOCK_DURATION', 15), // minutes
    },
    rsa: {
      enabled: envBoolean('RSA_ENABLE', true),
      keyBits: envNumber('RSA_KEY_BITS', 2048),
      /** 当前密钥有效期（秒），需 ≥ rotateSeconds × 2 保证重叠窗口 */
      ttlSeconds: envNumber('RSA_TTL_SECONDS', 300),
      /** 定时轮换间隔（秒），建议 ttl / 2 */
      rotateSeconds: envNumber('RSA_ROTATE_SECONDS', 150),
    },
  };
});

export type ISecurityConfig = ConfigType<typeof SecurityConfig>;
