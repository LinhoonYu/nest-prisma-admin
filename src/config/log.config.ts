import { ConfigType, registerAs } from '@nestjs/config';

import { env, envBoolean } from '~/global/env';

export const logRegToken = 'log';

export const LogConfig = registerAs(logRegToken, () => ({
  level: env('LOG_LEVEL', ''),
  dir: env('LOG_DIR', 'logs'),
  maxSize: env('LOG_MAX_SIZE', '20m'),
  maxFiles: env('LOG_MAX_FILES', '30d'),
  zippedArchive: envBoolean('LOG_ZIPPED', true),
}));

export type ILogConfig = ConfigType<typeof LogConfig>;
