import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '~/generated/prisma/client';
import { isDev } from '~/global/env';

import { softDeleteExtension } from './soft-delete.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private readonly _extended = this.$extends(softDeleteExtension(this));

  constructor(configService: ConfigService) {
    const url = configService.get<string>('DATABASE_URL');
    if (!url) throw new Error('DATABASE_URL is not configured');

    super({
      adapter: new PrismaPg({ connectionString: url }),
      log: isDev ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });

    // 优先将属性访问转发到扩展后的 client，使 query 拦截自动生效。
    // _extended 上有 model delegate 和 Prisma 方法（$transaction 等），
    // target 上有 NestJS 自身的方法和字段（logger, onModuleInit）。
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (Reflect.has(target._extended, prop)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return Reflect.get(target._extended, prop);
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma client connected');
  }
}
