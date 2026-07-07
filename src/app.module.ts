import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WinstonModule } from 'nest-winston';
import {
  I18nModule,
  AcceptLanguageResolver,
  I18nService,
  I18nValidationPipe,
} from 'nestjs-i18n';
import * as path from 'path';

import { AllExceptionFilter } from '~/common/filters/all-exception.filter';
import { LoggerModule } from '~/common/logger/logger.module';
import {
  AppConfig,
  LogConfig,
  OauthConfig,
  RabbitmqConfig,
  SecurityConfig,
  StorageConfig,
  SwaggerConfig,
} from '~/config';
import { getWinstonInstance } from '~/config/winston.config';
import { HealthModule } from '~/global/health/health.module';
import { AuthModule } from '~/modules/auth/auth.module';
import { ConfigModule } from '~/modules/config/config.module';
import { DictModule } from '~/modules/dict/dict.module';
import { FileModule } from '~/modules/file/file.module';
import { IamModule } from '~/modules/iam/iam.module';
import { LogModule } from '~/modules/log/log.module';
import { NoticeModule } from '~/modules/notice/notice.module';
import { WsModule } from '~/modules/ws/ws.module';
import { PrismaModule } from '~/shared/prisma/prisma.module';
import { RabbitmqModule } from '~/shared/rabbitmq/rabbitmq.module';
import { RedisModule } from '~/shared/redis/redis.module';
import { S3Module } from '~/shared/s3/s3.module';
import { AppLogger } from '~/common/logger/app-logger';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'zh-CN',
      loaderOptions: {
        path: path.join(__dirname, 'i18n'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [AcceptLanguageResolver],
    }),
    WinstonModule.forRoot({ instance: getWinstonInstance() }),
    LoggerModule,
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [
        AppConfig,
        LogConfig,
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
  providers: [
    {
      provide: APP_FILTER,
      inject: [AppLogger, I18nService],
      useFactory: (logger: AppLogger, i18n: I18nService) =>
        new AllExceptionFilter(logger, i18n),
    },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new I18nValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer): void {
    // 中间件注册在此（当前无全局中间件）
  }
}
