import { Injectable } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { PrismaService } from '~/shared/prisma/prisma.service';

import { MyNoticeQueryDto } from './dto/my-notice.dto';

@Injectable()
export class MyNoticeService {
  constructor(private prisma: PrismaService) {}

  async list(userId: bigint, query: MyNoticeQueryDto) {
    const { page, pageSize, title, isRead } = query;
    const userIdNum = Number(userId);

    const baseWhere = {
      publishStatus: 1,
      deletedAt: null,
      OR: [
        { targetType: 1 },
        { targetType: 2, targetUserIds: { array_contains: userIdNum } },
      ],
      ...(title && {
        title: { contains: title, mode: 'insensitive' as const },
      }),
    };

    // isRead 过滤：0=未读（无 readRecord），1=已读（有 readRecord）
    const where =
      isRead === undefined
        ? baseWhere
        : isRead === 0
          ? { ...baseWhere, readRecords: { none: { userId } } }
          : { ...baseWhere, readRecords: { some: { userId } } };

    const [items, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { publishTime: 'desc' },
        include: {
          readRecords: {
            where: { userId },
            select: { readAt: true },
          },
        },
      }),
      this.prisma.notice.count({ where }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        type: n.type,
        level: n.level,
        publishTime: n.publishTime,
        isRead: n.readRecords.length > 0 ? 1 : 0,
      })),
      total,
      page,
      pageSize,
    };
  }

  async detail(userId: bigint, noticeId: bigint) {
    const notice = await this.prisma.notice.findUnique({
      where: { id: noticeId },
    });
    if (!notice || notice.deletedAt || notice.publishStatus !== 1) {
      throw new ApiException(ApiCode.NoticeNotFound);
    }

    // 鉴权：指定用户通知仅目标用户可见
    if (notice.targetType === 2) {
      const ids = (notice.targetUserIds as number[]) ?? [];
      if (!ids.includes(Number(userId))) {
        throw new ApiException(ApiCode.NotFound);
      }
    }

    // 幂等标记已读
    await this.prisma.noticeReadRecord.upsert({
      where: { noticeId_userId: { noticeId, userId } },
      create: { noticeId, userId },
      update: {},
    });

    return {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      type: notice.type,
      level: notice.level,
      publisherId: notice.publisherId,
      publishTime: notice.publishTime,
    };
  }

  async unreadCount(userId: bigint) {
    const userIdNum = Number(userId);
    const where = {
      publishStatus: 1,
      deletedAt: null,
      readRecords: { none: { userId } },
      OR: [
        { targetType: 1 },
        { targetType: 2, targetUserIds: { array_contains: userIdNum } },
      ],
    };

    const total = await this.prisma.notice.count({ where });
    return { count: total };
  }

  async readAll(userId: bigint) {
    const userIdNum = Number(userId);
    const where = {
      publishStatus: 1,
      deletedAt: null,
      readRecords: { none: { userId } },
      OR: [
        { targetType: 1 },
        { targetType: 2, targetUserIds: { array_contains: userIdNum } },
      ],
    };

    const notices = await this.prisma.notice.findMany({
      where,
      select: { id: true },
    });

    if (notices.length === 0) return { count: 0 };

    await this.prisma.noticeReadRecord.createMany({
      data: notices.map((n) => ({ noticeId: n.id, userId })),
      skipDuplicates: true,
    });

    return { count: notices.length };
  }
}
