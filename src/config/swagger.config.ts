import { ConfigType, registerAs } from '@nestjs/config';

import { env, envBoolean, isDev } from '~/global/env';

export const swaggerRegToken = 'swagger';

export const SwaggerConfig = registerAs(swaggerRegToken, () => ({
  enable: envBoolean('SWAGGER_ENABLE', isDev),
  path: env('SWAGGER_PATH', 'api-docs'),
  title: env('SWAGGER_TITLE', 'nest-prisma-admin'),
  description: env('SWAGGER_DESCRIPTION', 'API 文档'),
  version: env('SWAGGER_VERSION', '1.0.0'),
}));

export type ISwaggerConfig = ConfigType<typeof SwaggerConfig>;
