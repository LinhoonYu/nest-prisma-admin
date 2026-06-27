import { ConfigType, registerAs } from '@nestjs/config'

import { env, envBoolean, envNumber } from '~/global/env'

export const appRegToken = 'app'

const globalPrefix = env('GLOBAL_PREFIX', 'api')

export const AppConfig = registerAs(appRegToken, () => ({
  name: env('APP_NAME', 'nest-prisma-admin'),
  port: envNumber('APP_PORT', 3000),
  globalPrefix,
  multiDeviceLogin: envBoolean('MULTI_DEVICE_LOGIN', true),
}))

export type IAppConfig = ConfigType<typeof AppConfig>

export const RouterWhiteList: string[] = [
  `/${globalPrefix}/auth/login`,
]
