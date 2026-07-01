import { Controller, Get, VERSION_NEUTRAL, Version } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
} from '@nestjs/terminus';

import { Public } from '~/common/decorators/public.decorator';
import { PrismaService } from '~/shared/prisma/prisma.service';
import { RedisService } from '~/shared/redis/redis.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Version(VERSION_NEUTRAL)
  liveness() {
    return { status: 'ok', service: 'nest-prisma-admin' };
  }

  @Get('ready')
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        await this.prisma.$queryRaw`SELECT 1`;
        return { prisma: { status: 'up' as const } };
      },
      async () => {
        const pong = await this.redis.getClient().ping();
        return { redis: { status: pong === 'PONG' ? 'up' : 'down' } };
      },
    ]);
  }
}
