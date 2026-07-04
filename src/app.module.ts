import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from './modules/config/config.module';
import { DictModule } from './modules/dict/dict.module';
import { FileModule } from './modules/file/file.module';
import { IamModule } from './modules/iam/iam.module';
import { LogModule } from './modules/log/log.module';
import { NoticeModule } from './modules/notice/notice.module';
import { WsModule } from './modules/ws/ws.module';
import {
  AppConfig,
  OauthConfig,
  RabbitmqConfig,
  SecurityConfig,
  StorageConfig,
  SwaggerConfig,
} from '~/config';
import { HealthModule } from '~/global/health/health.module';
import { PrismaModule } from '~/shared/prisma/prisma.module';
import { RabbitmqModule } from '~/shared/rabbitmq/rabbitmq.module';
import { RedisModule } from '~/shared/redis/redis.module';
import { S3Module } from '~/shared/s3/s3.module';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [
        AppConfig,
        OauthConfig,
        RabbitmqConfig,
        SecurityConfig,
        StorageConfig,
        SwaggerConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RabbitmqModule,
    RedisModule,
    S3Module,
    HealthModule,
    AuthModule,
    IamModule,
    DictModule,
    ConfigModule,
    FileModule,
    LogModule,
    NoticeModule,
    WsModule,
  ],
})
export class AppModule {}
