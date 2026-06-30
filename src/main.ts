import { Reflector } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AllConfigType } from '~/config';
import { AllExceptionFilter } from '~/common/filters/all-exception.filter';
import { TransformInterceptor } from '~/common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.enableShutdownHooks();

  const configService = app.get(ConfigService<AllConfigType>);

  const globalPrefix =
    configService.get('app.globalPrefix', { infer: true }) || 'api';
  app.setGlobalPrefix(globalPrefix);

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

  const logger = new Logger('Bootstrap');
  logger.log(`Server running on http://localhost:${port}/${globalPrefix}`);
  if (swaggerConfig?.enable) {
    logger.log(
      `Swagger docs at http://localhost:${port}/${swaggerConfig.path}`,
    );
  }
}

bootstrap();
