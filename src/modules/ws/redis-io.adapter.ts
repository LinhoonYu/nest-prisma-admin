import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import type { ServerOptions } from 'socket.io';

/**
 * Redis IO Adapter — 多实例水平扩展，Redis 不可用时降级为单机模式
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  async connectToRedis(redisUrl?: string): Promise<void> {
    try {
      const url = redisUrl || process.env.REDIS_IO_ADAPTER_URL;

      if (!url) {
        this.logger.warn(
          'REDIS_IO_ADAPTER_URL 未配置，跳过 Redis 适配器（将使用单机内存模式）',
        );
        return;
      }

      const pubClient = new Redis(url);
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);

      this.logger.log('Redis IO Adapter 已就绪（多实例模式）');
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
