import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { JwtPayload } from '~/common/decorators/current-user.decorator';
import { ISecurityConfig, SecurityConfig } from '~/config';
import { PrismaService } from '~/shared/prisma/prisma.service';
import { RedisService } from '~/shared/redis/redis.service';

import { SessionService } from './session.service';

const BLACKLIST_PREFIX = 'blacklist:';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhdw])$/);
  if (!match) return 7 * 24 * 60 * 60;
  const [, num, unit] = match;
  const value = parseInt(num, 10);
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };
  return value * (multipliers[unit] || 86400);
}

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
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

  async signRefresh(
    userId: string,
    sessionId: string,
    familyId: string,
    parentId?: string,
  ): Promise<string> {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresInSeconds = parseDuration(
      this.securityConfig.refresh.expiresIn,
    );
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: BigInt(userId),
        sessionId: BigInt(sessionId),
        tokenHash,
        familyId: BigInt(familyId),
        parentId: parentId ? BigInt(parentId) : null,
        expiresAt,
      },
    });

    return token;
  }

  async rotateRefresh(
    oldToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashToken(oldToken);
    const oldRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!oldRecord || oldRecord.expiresAt < new Date()) {
      throw new ApiException(
        ApiCode.RefreshTokenInvalid,
        '刷新令牌无效或已过期',
      );
    }

    // 复用检测：已撤销的 token 再次被使用，说明可能被盗
    if (oldRecord.revokedAt) {
      await this.revokeFamily(oldRecord.familyId, oldRecord.sessionId);
      throw new ApiException(
        ApiCode.RefreshTokenReuseDetected,
        '检测到刷新令牌复用，请重新登录',
      );
    }

    const newToken = generateToken();
    const newTokenHash = hashToken(newToken);
    const expiresInSeconds = parseDuration(
      this.securityConfig.refresh.expiresIn,
    );
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const newRecord = await this.prisma.refreshToken.create({
      data: {
        userId: oldRecord.userId,
        sessionId: oldRecord.sessionId,
        tokenHash: newTokenHash,
        familyId: oldRecord.familyId,
        parentId: oldRecord.id,
        expiresAt,
      },
    });

    await this.prisma.refreshToken.update({
      where: { id: oldRecord.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: newRecord.id,
      },
    });

    const accessToken = this.signAccess(
      oldRecord.userId.toString(),
      oldRecord.sessionId.toString(),
    );

    return { accessToken, refreshToken: newToken };
  }

  async blacklistAccess(token: string): Promise<void> {
    const decoded = this.jwtService.decode<{ exp?: number } | null>(token);
    if (!decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setCache(BLACKLIST_PREFIX + hashToken(token), 1, ttl);
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    return this.redis.exists(BLACKLIST_PREFIX + hashToken(token));
  }

  private async revokeFamily(
    familyId: bigint,
    sessionId: bigint,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.authSession.update({
        where: { id: sessionId },
        data: {
          status: 2,
          revokedAt: new Date(),
          revokeReason: 'Refresh token reuse detected',
        },
      }),
    ]);
    await this.sessionService.clearActiveCache(sessionId);
  }
}
