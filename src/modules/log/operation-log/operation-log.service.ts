import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '~/shared/prisma/prisma.service';

import {
  CleanOperationLogDto,
  OperationLogQueryDto,
} from './dto/operation-log.dto';

export interface OperationLogRecord {
  userId?: bigint;
  username?: string;
  module?: string;
  action?: string;
  description?: string;
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  requestParams?: unknown;
  requestBody?: unknown;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
  durationMs?: number;
}

@Injectable()
export class OperationLogService {
  private readonly logger = new Logger(OperationLogService.name);

  constructor(private prisma: PrismaService) {}

  async list(query: OperationLogQueryDto) {
    const {
      page,
      pageSize,
      userId,
      username,
      module,
      action,
      method,
      path,
      success,
      startTime,
      endTime,
    } = query;

    const where = {
      ...(userId !== undefined && { userId }),
      ...(username && { username: { contains: username } }),
      ...(module && { module: { contains: module } }),
      ...(action && { action: { contains: action } }),
      ...(method && { method }),
      ...(path && { path: { contains: path } }),
      ...(success !== undefined && { success: success === 1 }),
      ...(startTime &&
        endTime && {
          createdAt: { gte: new Date(startTime), lte: new Date(endTime) },
        }),
    };

    const [items, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: bigint) {
    return this.prisma.operationLog.findUnique({ where: { id } });
  }

  /** 写入一条操作日志，不抛异常以免影响主流程 */
  async record(data: OperationLogRecord): Promise<void> {
    try {
      await this.prisma.operationLog.create({
        data: {
          ...data,
          requestParams: data.requestParams as never,
          requestBody: data.requestBody as never,
        },
      });
    } catch (e) {
      this.logger.error(
        `Failed to record operation log: ${(e as Error).message}`,
        (e as Error).stack,
      );
    }
  }

  /** 物理删除早于指定天数的记录 */
  async clean(dto: CleanOperationLogDto): Promise<{ count: number }> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - dto.keepDays);

    const result = await this.prisma.operationLog.deleteMany({
      where: { createdAt: { lt: threshold } },
    });
    return { count: result.count };
  }
}
