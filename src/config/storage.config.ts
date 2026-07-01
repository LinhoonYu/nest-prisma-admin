import { ConfigType, registerAs } from '@nestjs/config';

import { env, envNumber } from '~/global/env';

export const storageRegToken = 'storage';

export const StorageConfig = registerAs(storageRegToken, () => ({
  endpoint: env('S3_ENDPOINT', 'http://localhost:9000'),
  accessKey: env('S3_ACCESS_KEY', 'minioadmin'),
  secretKey: env('S3_SECRET_KEY', 'minioadmin'),
  bucket: env('S3_BUCKET', 'nest-prisma-admin'),
  region: env('S3_REGION', 'us-east-1'),
  presignExpiry: envNumber('S3_PRESIGN_EXPIRY', 3600),
  maxFileSize: envNumber('S3_MAX_FILE_SIZE', 50),
}));

export type IStorageConfig = ConfigType<typeof StorageConfig>;
