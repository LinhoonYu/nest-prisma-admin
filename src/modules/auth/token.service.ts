import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { JwtPayload } from '~/common/decorators/current-user.decorator';
import { ISecurityConfig, SecurityConfig } from '~/config';
import { RedisService } from '~/shared/redis/redis.service';
import { refreshTokenKey } from '~/shared/redis/redis-keys';

import { SessionService } from './session.service';
import { parseDuration } from './token-utils';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

interface RefreshTokenData {
  userId: string;
  sessionId: string;
  /** active=正常可用, revoked=已轮换（再次使用触发复用检测） */
  status: 'active' | 'revoked';
}

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private redis: RedisService,
    private sessionService: SessionService,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
  ) {}

  signAccess(userId: string, sessionId: string): string {
    return this.jwtService.sign({ userId, sessionId });
  }

  async verifyAccess(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }

  async signRefresh(userId: string, sessionId: string): Promise<string> {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const ttl = parseDuration(this.securityConfig.refresh.expiresIn);
    const data: RefreshTokenData = { userId, sessionId, status: 'active' };

    await this.redis.setCache(refreshTokenKey(tokenHash), data, ttl);
    return token;
  }

  async rotateRefresh(
    oldToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const oldHash = hashToken(oldToken);
    const oldData = await this.redis.getCache<RefreshTokenData>(
      refreshTokenKey(oldHash),
    );

    if (!oldData) {
      throw new ApiException(
        ApiCode.RefreshTokenInvalid,
        '刷新令牌无效或已过期',
      );
    }

    // 已轮换的 token 再次被使用，说明可能被盗
    if (oldData.status === 'revoked') {
      await this.sessionService.revoke(oldData.sessionId);
      throw new ApiException(
        ApiCode.RefreshTokenReuseDetected,
        '检测到刷新令牌复用，请重新登录',
      );
    }

    // session 已被撤销（登出/踢下线），拒绝刷新
    const sessionActive = await this.sessionService.isActive(oldData.sessionId);
    if (!sessionActive) {
      throw new ApiException(
        ApiCode.RefreshTokenInvalid,
        '刷新令牌无效或已过期',
      );
    }

    const ttl = parseDuration(this.securityConfig.refresh.expiresIn);

    // 标记旧 token 为已轮换，保留 TTL 作为复用检测窗口
    const revoked: RefreshTokenData = { ...oldData, status: 'revoked' };
    await this.redis.setCache(refreshTokenKey(oldHash), revoked, ttl);

    // 签发新 token
    const newToken = generateToken();
    const newData: RefreshTokenData = {
      userId: oldData.userId,
      sessionId: oldData.sessionId,
      status: 'active',
    };
    await this.redis.setCache(
      refreshTokenKey(hashToken(newToken)),
      newData,
      ttl,
    );

    // 续期 session 和 user:sessions SET，保持滑动窗口
    await this.sessionService.renew(oldData.sessionId, oldData.userId);

    const accessToken = this.signAccess(oldData.userId, oldData.sessionId);
    return { accessToken, refreshToken: newToken };
  }
}
