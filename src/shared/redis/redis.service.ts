import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import { AppLogger } from '~/common/logger/app-logger';

const KEY_PREFIX = 'npa:';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private connected = false;

  constructor(
    configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(RedisService.name);
    const host = configService.get<string>('REDIS_HOST') || '127.0.0.1';
    const port = configService.get<number>('REDIS_PORT') || 6379;
    const password = configService.get<string>('REDIS_PASSWORD') || undefined;
    const db = configService.get<number>('REDIS_DB') ?? 0;

    this.client = new Redis({
      host,
      port,
      password,
      db,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 10) return null; // give up
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.info(`Redis connected: ${host}:${port}/${db}`);
    });

    this.client.on('error', (err) => {
      this.connected = false;
      this.logger.error(`Redis error: ${err.message}`, { error: err });
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (err) {
      this.logger.warn(
        `Redis connection failed on startup: ${(err as Error).message}. Caching/captcha features will be unavailable.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.client.quit();
      this.logger.info('Redis disconnected');
    }
  }

  // ---- 基础方法 ----

  getClient(): Redis {
    return this.client;
  }

  // ---- 语义化缓存方法 ----

  /**
   * 设置缓存，自动加命名空间前缀，自动 JSON 序列化
   */
  async setCache<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const prefixed = this.prefix(key);
    if (ttlSeconds !== undefined) {
      await this.client.setex(prefixed, ttlSeconds, serialized);
    } else {
      await this.client.set(prefixed, serialized);
    }
  }

  /**
   * 获取缓存，自动反序列化
   */
  async getCache<T>(key: string): Promise<T | null> {
    const data = await this.client.get(this.prefix(key));
    if (data === null) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(this.prefix(key));
  }

  async delMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(...keys.map((k) => this.prefix(k)));
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const values = await this.client.mget(...keys.map((k) => this.prefix(k)));
    return values.map((data) => {
      if (data === null) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    });
  }

  async getAndDelete<T>(key: string): Promise<T | null> {
    const data = (await this.client.call('GETDEL', this.prefix(key))) as
      | string
      | null;
    if (data === null) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(this.prefix(key));
    return result === 1;
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.expire(this.prefix(key), ttlSeconds);
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(this.prefix(key));
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(this.prefix(key));
  }

  private prefix(key: string): string {
    return `${KEY_PREFIX}${key}`;
  }
}
