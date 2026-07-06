import { Inject, Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';

import { ISecurityConfig, SecurityConfig } from '~/config';
import { RedisService } from '~/shared/redis/redis.service';
import { sessionKey, userSessionsKey } from '~/shared/redis/redis-keys';

import { parseDuration } from './token-utils';

interface SessionData {
  userId: string;
}

@Injectable()
export class SessionService {
  constructor(
    private redis: RedisService,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
  ) {}

  async create(userId: string): Promise<string> {
    const sessionId = nanoid();
    const ttl = parseDuration(this.securityConfig.refresh.expiresIn);
    const data: SessionData = { userId };

    await this.redis.setCache(sessionKey(sessionId), data, ttl);
    await this.redis.sAdd(userSessionsKey(userId), [sessionId], ttl);
    return sessionId;
  }

  async isActive(sessionId: string): Promise<boolean> {
    return this.redis.exists(sessionKey(sessionId));
  }

  async getUserId(sessionId: string): Promise<string | null> {
    const data = await this.redis.getCache<SessionData>(sessionKey(sessionId));
    return data?.userId ?? null;
  }

  async revoke(sessionId: string): Promise<void> {
    const userId = await this.getUserId(sessionId);
    await this.redis.del(sessionKey(sessionId));
    if (userId) {
      await this.redis.sRem(userSessionsKey(userId), sessionId);
    }
  }

  async revokeByUser(userId: string): Promise<void> {
    const sessionIds = await this.redis.sMembers(userSessionsKey(userId));
    if (sessionIds.length === 0) return;

    await this.redis.delMany(sessionIds.map((id) => sessionKey(id)));
    await this.redis.del(userSessionsKey(userId));
  }

  /** 刷新时续期 session 和 user:sessions SET，保持滑动窗口 */
  async renew(sessionId: string, userId: string): Promise<void> {
    const ttl = parseDuration(this.securityConfig.refresh.expiresIn);
    await this.redis.expire(sessionKey(sessionId), ttl);
    await this.redis.expire(userSessionsKey(userId), ttl);
  }
}
