import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '~/shared/prisma/prisma.service';

import { CleanLoginLogDto, LoginLogQueryDto } from './dto/login-log.dto';

export interface LoginLogRecord {
  userId?: bigint;
  username?: string;
  loginType: number;
  provider?: string;
  ip?: string;
  location?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  status: number;
  failureReason?: string;
}

@Injectable()
export class LoginLogService {
  private readonly logger = new Logger(LoginLogService.name);

  constructor(private prisma: PrismaService) {}

  async list(query: LoginLogQueryDto) {
    const {
      page,
      pageSize,
      userId,
      username,
      loginType,
      ip,
      status,
      startTime,
      endTime,
    } = query;

    const where = {
      ...(userId !== undefined && { userId }),
      ...(username && { username: { contains: username } }),
      ...(loginType !== undefined && { loginType }),
      ...(ip && { ip: { contains: ip } }),
      ...(status !== undefined && { status }),
      ...(startTime &&
        endTime && {
          createdAt: { gte: new Date(startTime), lte: new Date(endTime) },
        }),
    };

    const [items, total] = await Promise.all([
      this.prisma.loginLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loginLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: bigint) {
    return this.prisma.loginLog.findUnique({ where: { id } });
  }

  /** 直接写入登录日志（供 Consumer 使用） */
  async record(data: LoginLogRecord): Promise<void> {
    try {
      await this.prisma.loginLog.create({ data });
    } catch (e) {
      this.logger.error(
        `Failed to record login log: ${(e as Error).message}`,
        (e as Error).stack,
      );
    }
  }

  /** 物理删除早于指定天数的记录 */
  async clean(dto: CleanLoginLogDto): Promise<{ count: number }> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - dto.keepDays);

    const result = await this.prisma.loginLog.deleteMany({
      where: { createdAt: { lt: threshold } },
    });
    return { count: result.count };
  }
}
