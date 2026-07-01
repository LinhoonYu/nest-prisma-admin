import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './modules/auth/auth.module';
import { DictModule } from './modules/dict/dict.module';
import { FileModule } from './modules/file/file.module';
import { IamModule } from './modules/iam/iam.module';
import { LogModule } from './modules/log/log.module';
import {
  AppConfig,
  SecurityConfig,
  StorageConfig,
  SwaggerConfig,
} from '~/config';
import { HealthModule } from '~/global/health/health.module';
import { PrismaModule } from '~/shared/prisma/prisma.module';
import { RedisModule } from '~/shared/redis/redis.module';
import { S3Module } from '~/shared/s3/s3.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, SecurityConfig, StorageConfig, SwaggerConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    S3Module,
    HealthModule,
    AuthModule,
    IamModule,
    DictModule,
    FileModule,
    LogModule,
  ],
})
export class AppModule {}
