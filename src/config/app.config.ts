import { ConfigType, registerAs } from '@nestjs/config';

import { env, envBoolean, envNumber } from '~/global/env';

export const appRegToken = 'app';

const globalPrefix = env('GLOBAL_PREFIX', 'api');

export const AppConfig = registerAs(appRegToken, () => ({
  name: env('APP_NAME', 'nest-prisma-admin'),
  port: envNumber('APP_PORT', 3000),
  globalPrefix,
  multiDeviceLogin: envBoolean('MULTI_DEVICE_LOGIN', true),
  /** 受保护的演示账号用户名，该账号不可修改密码、删除、修改角色等 */
  demoUsername: env('DEMO_USERNAME', ''),
}));

export type IAppConfig = ConfigType<typeof AppConfig>;
