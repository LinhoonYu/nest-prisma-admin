import { Inject, Injectable } from '@nestjs/common';
import dayjs from 'dayjs';

import { ISecurityConfig, SecurityConfig } from '~/config';
import { PrismaService } from '~/shared/prisma/prisma.service';
import { RedisService } from '~/shared/redis/redis.service';

const SESSION_ACTIVE_PREFIX = 'session:active:';
const SESSION_CACHE_TTL = 60;

interface SessionCreateInput {
  userId: bigint;
  loginType: number;
  ip?: string;
  userAgent?: string;
  deviceName?: string;
}

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
  ) {}

  async create(input: SessionCreateInput): Promise<bigint> {
    const expiresAt = dayjs()
      .add(this.securityConfig.refresh.ttlDays, 'day')
      .toDate();

    const session = await this.prisma.authSession.create({
      data: {
        userId: input.userId,
        loginType: input.loginType,
        ip: input.ip,
        userAgent: input.userAgent,
        deviceName: input.deviceName,
        expiresAt,
        status: 1,
      },
    });

    await this.cacheActive(session.id);
    return session.id;
  }

  async isActive(sessionId: bigint): Promise<boolean> {
    const cached = await this.redis.getCache<boolean>(
      SESSION_ACTIVE_PREFIX + sessionId,
    );
    if (cached !== null) return cached;

    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
      select: { status: true, expiresAt: true, revokedAt: true },
    });
    if (!session) return false;

    const active =
      session.status === 1 &&
      session.expiresAt > new Date() &&
      !session.revokedAt;

    if (active) await this.cacheActive(sessionId);
    return active;
  }

  async revoke(sessionId: bigint, reason: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.authSession.update({
        where: { id: sessionId },
        data: {
          status: 2,
          revokedAt: new Date(),
          revokeReason: reason,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.clearActiveCache(sessionId);
  }

  async revokeByUser(userId: bigint, reason: string): Promise<void> {
    const sessions = await this.prisma.authSession.findMany({
      where: { userId, status: 1 },
      select: { id: true },
    });
    if (sessions.length === 0) return;

    const sessionIds = sessions.map((s) => s.id);

    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: { id: { in: sessionIds } },
        data: {
          status: 2,
          revokedAt: new Date(),
          revokeReason: reason,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: { in: sessionIds }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.redis.delMany(
      sessionIds.map((id) => SESSION_ACTIVE_PREFIX + id),
    );
  }

  async touch(sessionId: bigint): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  async clearActiveCache(sessionId: bigint): Promise<void> {
    await this.redis.del(SESSION_ACTIVE_PREFIX + sessionId);
  }

  private async cacheActive(sessionId: bigint): Promise<void> {
    await this.redis.setCache(
      SESSION_ACTIVE_PREFIX + sessionId,
      true,
      SESSION_CACHE_TTL,
    );
  }
}
