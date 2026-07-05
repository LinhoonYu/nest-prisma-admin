import { Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { WinstonModule } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyMultipart from '@fastify/multipart';

import { AppModule } from './app.module';
import { AllConfigType } from '~/config';
import { getWinstonInstance } from '~/config/winston.config';
import { TransformInterceptor } from '~/common/interceptors/transform.interceptor';
import { RedisIoAdapter } from '~/modules/ws/redis-io.adapter';
import { RedisService } from '~/shared/redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
      logger: WinstonModule.createLogger({ instance: getWinstonInstance() }),
    },
  );

  app.enableShutdownHooks();

  const configService = app.get(ConfigService<AllConfigType>);

  const logger = getWinstonInstance().child({ context: 'Bootstrap' });

  // WebSocket Redis 适配器（用于多实例水平扩展）
  try {
    const redisService = app.get(RedisService);
    const redisIoAdapter = new RedisIoAdapter(app);
    redisIoAdapter.connectToRedis(redisService.getClient());
    app.useWebSocketAdapter(redisIoAdapter);
    logger.info('WebSocket Redis 适配器已启用');
  } catch (err) {
    logger.warn(`Redis 不可用，使用默认 WS 适配器: ${(err as Error).message}`);
  }

  const storageConfig = configService.get('storage', { infer: true });
  await app.register(fastifyMultipart, {
    limits: { fileSize: storageConfig!.maxFileSize * 1024 * 1024 },
  });

  const globalPrefix =
    configService.get('app.globalPrefix', { infer: true }) || 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: ['health', 'health/ready'],
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  const swaggerConfig = configService.get('swagger', { infer: true });
  if (swaggerConfig?.enable) {
    const docConfig = new DocumentBuilder()
      .setTitle(swaggerConfig.title)
      .setDescription(swaggerConfig.description)
      .setVersion(swaggerConfig.version)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup(swaggerConfig.path, app, document);
  }

  const port = configService.get('app.port', { infer: true }) || 3000;
  await app.listen(port, '0.0.0.0');

  logger.info(`Server running on http://localhost:${port}/${globalPrefix}`);
  if (swaggerConfig?.enable) {
    logger.info(
      `Swagger docs at http://localhost:${port}/${swaggerConfig.path}`,
    );
  }
}

void bootstrap();
