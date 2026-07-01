import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './modules/auth/auth.module';
import { DictModule } from './modules/dict/dict.module';
import { IamModule } from './modules/iam/iam.module';
import { LogModule } from './modules/log/log.module';
import { AppConfig, SecurityConfig, SwaggerConfig } from '~/config';
import { HealthModule } from '~/global/health/health.module';
import { PrismaModule } from '~/shared/prisma/prisma.module';
import { RedisModule } from '~/shared/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, SecurityConfig, SwaggerConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    IamModule,
    DictModule,
    LogModule,
  ],
})
export class AppModule {}
