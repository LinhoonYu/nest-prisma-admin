import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import type { ServerOptions } from 'socket.io';

import { getWinstonInstance } from '~/config/winston.config';

/**
 * Redis IO Adapter — 多实例水平扩展，Redis 不可用时降级为单机模式
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = getWinstonInstance().child({
    context: RedisIoAdapter.name,
  });
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  // 复用已连接的 Redis 实例，duplicate 出 pub/sub 两条连接
  // 不自己 new Redis，避免连接管理混乱
  connectToRedis(pubBase: Redis): void {
    try {
      const pubClient = pubBase.duplicate();
      const subClient = pubBase.duplicate();

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.info('Redis IO Adapter 已就绪（多实例模式）');
    } catch (err) {
      this.logger.warn(
        `Redis IO Adapter 初始化失败: ${(err as Error).message}。将使用单机内存模式。`,
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
