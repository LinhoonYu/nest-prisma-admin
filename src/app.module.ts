import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfig, SecurityConfig, SwaggerConfig } from '~/config';
import { PrismaModule } from '~/shared/prisma/prisma.module';
import { RedisModule } from '~/shared/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, SecurityConfig, SwaggerConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
