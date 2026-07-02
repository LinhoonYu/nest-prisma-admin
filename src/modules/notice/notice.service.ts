import { Injectable } from '@nestjs/common';
import { Prisma } from '~/generated/prisma/client';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { WsGateway } from '~/modules/ws/ws.gateway';
import { PrismaService } from '~/shared/prisma/prisma.service';

import {
  CreateNoticeDto,
  NoticeQueryDto,
  UpdateNoticeDto,
} from './dto/notice.dto';

@Injectable()
export class NoticeService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WsGateway,
  ) {}

  /* ========== 管理端 ========== */

  async list(query: NoticeQueryDto) {
    const { page, pageSize, title, publishStatus } = query;
    const where = {
      deletedAt: null,
      ...(title && {
        title: { contains: title, mode: 'insensitive' as const },
      }),
      ...(publishStatus !== undefined && { publishStatus }),
    };

    const [items, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notice.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: bigint) {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
    });
    if (!notice || notice.deletedAt) {
      throw new ApiException(ApiCode.NoticeNotFound, '通知不存在');
    }
    return notice;
  }

  async create(dto: CreateNoticeDto, operatorId: bigint) {
    if (
      dto.targetType === 2 &&
      (!dto.targetUserIds || dto.targetUserIds.length === 0)
    ) {
      throw new ApiException(ApiCode.BadRequest, '指定用户不能为空');
    }

    return this.prisma.notice.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        level: dto.level,
        targetType: dto.targetType,
        targetUserIds: dto.targetUserIds ?? Prisma.JsonNull,
        createdBy: operatorId,
        updatedBy: operatorId,
      },
    });
  }

  async update(id: bigint, dto: UpdateNoticeDto, operatorId: bigint) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.deletedAt) {
      throw new ApiException(ApiCode.NoticeNotFound, '通知不存在');
    }
    if (notice.publishStatus === 1) {
      throw new ApiException(ApiCode.BadRequest, '已发布通知不可修改');
    }

    if (
      dto.targetType === 2 &&
      dto.targetUserIds !== undefined &&
      dto.targetUserIds.length === 0
    ) {
      throw new ApiException(ApiCode.BadRequest, '指定用户不能为空');
    }

    return this.prisma.notice.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.targetType !== undefined && { targetType: dto.targetType }),
        ...(dto.targetUserIds !== undefined && {
          targetUserIds: dto.targetUserIds,
        }),
        updatedBy: operatorId,
      },
    });
  }

  async remove(id: bigint) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.deletedAt) {
      throw new ApiException(ApiCode.NoticeNotFound, '通知不存在');
    }
    if (notice.publishStatus === 1) {
      throw new ApiException(
        ApiCode.BadRequest,
        '已发布通知不可删除，请先撤回',
      );
    }

    return this.prisma.notice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async removeBatch(ids: bigint[]) {
    const notices = await this.prisma.notice.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });

    const published = notices.filter((n) => n.publishStatus === 1);
    if (published.length > 0) {
      throw new ApiException(
        ApiCode.BadRequest,
        `通知 ${published.map((n) => n.id.toString()).join(', ')} 已发布，请先撤回`,
      );
    }

    const result = await this.prisma.notice.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { count: result.count };
  }

  async publish(id: bigint, operatorId: bigint) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.deletedAt) {
      throw new ApiException(ApiCode.NoticeNotFound, '通知不存在');
    }
    if (notice.publishStatus === 1) {
      throw new ApiException(ApiCode.NoticeAlreadyPublished, '通知已发布');
    }
    if (notice.publishStatus === -1) {
      throw new ApiException(ApiCode.BadRequest, '已撤回通知不可重新发布');
    }

    const updated = await this.prisma.notice.update({
      where: { id },
      data: {
        publishStatus: 1,
        publishTime: new Date(),
        publisherId: operatorId,
        updatedBy: operatorId,
      },
    });

    this.pushNotice(updated);
    return updated;
  }

  async revoke(id: bigint, operatorId: bigint) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.deletedAt) {
      throw new ApiException(ApiCode.NoticeNotFound, '通知不存在');
    }
    if (notice.publishStatus !== 1) {
      throw new ApiException(ApiCode.NoticeNotPublished, '仅已发布通知可撤回');
    }

    const updated = await this.prisma.notice.update({
      where: { id },
      data: {
        publishStatus: -1,
        revokeTime: new Date(),
        updatedBy: operatorId,
      },
    });

    this.pushRevoke(updated);
    return updated;
  }

  /* ========== WebSocket 推送 ========== */

  private pushNotice(notice: {
    id: bigint;
    title: string;
    type: number;
    level: string;
    publishTime: Date | null;
    targetType: number;
    targetUserIds: unknown;
  }): void {
    const payload = {
      id: notice.id.toString(),
      title: notice.title,
      type: notice.type,
      level: notice.level,
      publishTime: notice.publishTime?.toISOString() ?? null,
    };

    if (notice.targetType === 1) {
      this.wsGateway.broadcast('notice', payload);
    } else {
      const userIds = (notice.targetUserIds as number[]) ?? [];
      for (const uid of userIds) {
        this.wsGateway.sendToUser(uid.toString(), 'notice', payload);
      }
    }
  }

  private pushRevoke(notice: {
    id: bigint;
    targetType: number;
    targetUserIds: unknown;
  }): void {
    const payload = { id: notice.id.toString() };

    if (notice.targetType === 1) {
      this.wsGateway.broadcast('notice-revoke', payload);
    } else {
      const userIds = (notice.targetUserIds as number[]) ?? [];
      for (const uid of userIds) {
        this.wsGateway.sendToUser(uid.toString(), 'notice-revoke', payload);
      }
    }
  }
}
