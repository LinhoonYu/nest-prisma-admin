import { Reflector } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyMultipart from '@fastify/multipart';

import { AppModule } from './app.module';
import { AllConfigType } from '~/config';
import { AllExceptionFilter } from '~/common/filters/all-exception.filter';
import { TransformInterceptor } from '~/common/interceptors/transform.interceptor';
import { RedisIoAdapter } from '~/modules/ws/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.enableShutdownHooks();

  const configService = app.get(ConfigService<AllConfigType>);

  // WebSocket Redis 适配器（用于多实例水平扩展）
  const logger = new Logger('Bootstrap');
  try {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    logger.log('WebSocket Redis 适配器已启用');
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
  app.useGlobalFilters(new AllExceptionFilter());
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

  logger.log(`Server running on http://localhost:${port}/${globalPrefix}`);
  if (swaggerConfig?.enable) {
    logger.log(
      `Swagger docs at http://localhost:${port}/${swaggerConfig.path}`,
    );
  }
}

void bootstrap();
