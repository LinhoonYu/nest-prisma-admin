import { Injectable } from '@nestjs/common';
import { Prisma } from '~/generated/prisma/client';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { AppLogger } from '~/common/logger/app-logger';
import { WsGateway } from '~/modules/ws/ws.gateway';
import { PrismaService } from '~/shared/prisma/prisma.service';

import {
  CreateNoticeDto,
  NoticeQueryDto,
  UpdateNoticeDto,
} from './dto/notice.dto';
import { NoticeProducer } from './notice.producer';

@Injectable()
export class NoticeService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WsGateway,
    private producer: NoticeProducer,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(NoticeService.name);
  }

  async list(query: NoticeQueryDto) {
    const { page, pageSize, title, publishStatus, sendStatus } = query;
    const where = {
      deletedAt: null,
      ...(title && {
        title: { contains: title, mode: 'insensitive' as const },
      }),
      ...(publishStatus !== undefined && { publishStatus }),
      ...(sendStatus !== undefined && { sendStatus }),
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
      throw new ApiException(ApiCode.NoticeNotFound);
    }
    return notice;
  }

  async create(dto: CreateNoticeDto, operatorId: bigint) {
    if (
      dto.targetType === 2 &&
      (!dto.targetUserIds || dto.targetUserIds.length === 0)
    ) {
      throw new ApiException(ApiCode.BadRequest);
    }
    if (dto.sendMode === 2 && !dto.sendTime) {
      throw new ApiException(ApiCode.NoticeSendTimeRequired);
    }

    return this.prisma.notice.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        level: dto.level,
        targetType: dto.targetType,
        targetUserIds: dto.targetUserIds ?? Prisma.JsonNull,
        sendMode: dto.sendMode,
        ...(dto.sendTime && { sendTime: new Date(dto.sendTime) }),
        ...(dto.expireDays !== undefined && { expireDays: dto.expireDays }),
        createdBy: operatorId,
        updatedBy: operatorId,
      },
    });
  }

  async update(id: bigint, dto: UpdateNoticeDto, operatorId: bigint) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.deletedAt) {
      throw new ApiException(ApiCode.NoticeNotFound);
    }
    // 已发布(1) 或 定时发布中(2) 不可编辑
    if (notice.publishStatus === 1 || notice.publishStatus === 2) {
      throw new ApiException(ApiCode.BadRequest);
    }

    if (
      dto.targetType === 2 &&
      dto.targetUserIds !== undefined &&
      dto.targetUserIds.length === 0
    ) {
      throw new ApiException(ApiCode.BadRequest);
    }

    const effectiveSendMode = dto.sendMode ?? notice.sendMode;
    const effectiveSendTime =
      dto.sendTime !== undefined ? new Date(dto.sendTime) : notice.sendTime;
    if (effectiveSendMode === 2 && !effectiveSendTime) {
      throw new ApiException(ApiCode.NoticeSendTimeRequired);
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
        ...(dto.sendMode !== undefined && { sendMode: dto.sendMode }),
        ...(dto.sendTime !== undefined && { sendTime: new Date(dto.sendTime) }),
        ...(dto.expireDays !== undefined && { expireDays: dto.expireDays }),
        updatedBy: operatorId,
      },
    });
  }

  async remove(id: bigint) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.deletedAt) {
      throw new ApiException(ApiCode.NoticeNotFound);
    }
    // 已发布(1) 或 定时发布中(2) 不可删除
    if (notice.publishStatus === 1 || notice.publishStatus === 2) {
      throw new ApiException(ApiCode.BadRequest);
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

    const blocked = notices.filter(
      (n) => n.publishStatus === 1 || n.publishStatus === 2,
    );
    if (blocked.length > 0) {
      throw new ApiException(ApiCode.BadRequest);
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
      throw new ApiException(ApiCode.NoticeNotFound);
    }
    if (notice.publishStatus === 1) {
      throw new ApiException(ApiCode.NoticeAlreadyPublished);
    }
    if (notice.publishStatus === 2) {
      throw new ApiException(ApiCode.BadRequest);
    }
    if (notice.publishStatus === -1) {
      throw new ApiException(ApiCode.BadRequest);
    }

    if (notice.sendMode === 2) {
      if (!notice.sendTime) {
        throw new ApiException(ApiCode.NoticeSendTimeRequired);
      }
      if (notice.sendTime <= new Date()) {
        throw new ApiException(ApiCode.NoticeSendTimePast);
      }
    }

    const isScheduled = notice.sendMode === 2;
    const updated = await this.prisma.notice.update({
      where: { id },
      data: {
        // 定时通知进入「定时发布中」状态，到时间后由 consumer 设为已发布
        publishStatus: isScheduled ? 2 : 1,
        ...(isScheduled ? {} : { publishTime: new Date() }),
        publisherId: operatorId,
        updatedBy: operatorId,
        sendStatus: 0,
      },
    });

    const delayMs = isScheduled
      ? Math.max(0, notice.sendTime!.getTime() - Date.now())
      : 0;

    try {
      await this.producer.send(
        { noticeId: id.toString(), retryCount: 0 },
        delayMs,
      );
      return updated;
    } catch (e) {
      if (notice.sendMode === 1) {
        this.logger.warn(
          `MQ unavailable, fallback to direct push: ${(e as Error).message}`,
        );
        this.pushNotice(updated);
        return this.prisma.notice.update({
          where: { id },
          data: { sendStatus: 2 },
        });
      }

      await this.prisma.notice.update({
        where: { id },
        data: { sendStatus: -1 },
      });
      throw new ApiException(ApiCode.NoticeMqUnavailable);
    }
  }

  async revoke(id: bigint, operatorId: bigint) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.deletedAt) {
      throw new ApiException(ApiCode.NoticeNotFound);
    }
    // 已发布(1) 或 定时发布中(2) 均可撤回
    if (notice.publishStatus !== 1 && notice.publishStatus !== 2) {
      throw new ApiException(ApiCode.NoticeNotPublished);
    }

    const updated = await this.prisma.notice.update({
      where: { id },
      data: {
        publishStatus: -1,
        revokeTime: new Date(),
        updatedBy: operatorId,
      },
    });

    // 仅已发布的通知需要通知用户撤回，定时发布中的通知用户尚未收到
    if (notice.publishStatus === 1) {
      this.pushRevoke(updated);
    }
    return updated;
  }

  async retry(id: bigint) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.deletedAt) {
      throw new ApiException(ApiCode.NoticeNotFound);
    }
    // 已发布(1) 或 定时发布中(2) 均可重试
    if (notice.publishStatus !== 1 && notice.publishStatus !== 2) {
      throw new ApiException(ApiCode.NoticeNotPublished);
    }
    if (notice.sendStatus !== -1) {
      throw new ApiException(ApiCode.NoticeNotFailed);
    }

    await this.prisma.notice.update({
      where: { id },
      data: { sendStatus: 0 },
    });

    const delayMs =
      notice.sendMode === 2 && notice.sendTime
        ? Math.max(0, notice.sendTime.getTime() - Date.now())
        : 0;

    try {
      await this.producer.send(
        { noticeId: id.toString(), retryCount: 0 },
        delayMs,
      );
    } catch {
      await this.prisma.notice.update({
        where: { id },
        data: { sendStatus: -1 },
      });
      throw new ApiException(ApiCode.NoticeMqUnavailable);
    }
  }

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
      const raw = notice.targetUserIds;
      const userIds = Array.isArray(raw) ? (raw as number[]) : [];
      this.wsGateway.sendToUsers(userIds, 'notice', payload);
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
      const raw = notice.targetUserIds;
      const userIds = Array.isArray(raw) ? (raw as number[]) : [];
      this.wsGateway.sendToUsers(userIds, 'notice-revoke', payload);
    }
  }
}
