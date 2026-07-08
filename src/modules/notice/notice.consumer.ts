import { Injectable } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

import { AppLogger } from '~/common/logger/app-logger';
import { WsGateway } from '~/modules/ws/ws.gateway';
import { PrismaService } from '~/shared/prisma/prisma.service';
import {
  EXCHANGE_NOTICE,
  EXCHANGE_NOTICE_DLX,
  QUEUE_NOTICE_DEAD,
  QUEUE_NOTICE_PROCESS,
  ROUTING_KEY_NOTICE_DEAD,
  ROUTING_KEY_NOTICE_PROCESS,
} from '~/shared/rabbitmq/rabbitmq.constants';

import { NoticeMessagePayload, NoticeProducer } from './notice.producer';

const MAX_RETRY = 3;
const RETRY_DELAYS = [60_000, 300_000, 900_000]; // 1min, 5min, 15min

@Injectable()
export class NoticeConsumer {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WsGateway,
    private producer: NoticeProducer,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(NoticeConsumer.name);
  }

  @RabbitSubscribe({
    exchange: EXCHANGE_NOTICE,
    routingKey: ROUTING_KEY_NOTICE_PROCESS,
    queue: QUEUE_NOTICE_PROCESS,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
      deadLetterExchange: EXCHANGE_NOTICE_DLX,
      deadLetterRoutingKey: ROUTING_KEY_NOTICE_DEAD,
    },
  })
  async handle(data: NoticeMessagePayload): Promise<Nack | void> {
    const notice = await this.prisma.notice.findUnique({
      where: { id: BigInt(data.noticeId) },
    });

    // 已删除 → 跳过
    if (!notice || notice.deletedAt) return;
    // 已撤回 → 跳过
    if (notice.publishStatus === -1) return;
    // 已发送 → 幂等跳过
    if (notice.sendStatus === 2) return;
    // 仅处理 已发布(1) 或 定时发布中(2)
    if (notice.publishStatus !== 1 && notice.publishStatus !== 2) return;

    // 过期检查
    if (this.isExpired(notice)) {
      await this.prisma.notice.update({
        where: { id: notice.id },
        data: {
          // 定时发布中的通知过期时，标记为已发布（记录 publishTime），
          // 管理员可在列表中看到并撤回清理
          ...(notice.publishStatus === 2
            ? { publishStatus: 1, publishTime: new Date() }
            : {}),
          sendStatus: -2,
        },
      });
      return;
    }

    // 定时通知到期：转为已发布，记录真正的发布时间
    let noticeForPush = notice;
    if (notice.publishStatus === 2) {
      noticeForPush = await this.prisma.notice.update({
        where: { id: notice.id },
        data: {
          publishStatus: 1,
          publishTime: new Date(),
        },
      });
    }

    try {
      this.pushNotice(noticeForPush);
      // 条件更新：仅当 sendStatus 仍为 0 时才标记为已完成，防止并发重复推送
      const result = await this.prisma.notice.updateMany({
        where: { id: notice.id, sendStatus: 0 },
        data: { sendStatus: 2 },
      });
      if (result.count === 0) {
        // 已被其他 consumer 实例处理，跳过
        return;
      }
    } catch (e) {
      return this.handleFailure(data, e);
    }
  }

  @RabbitSubscribe({
    exchange: EXCHANGE_NOTICE_DLX,
    routingKey: ROUTING_KEY_NOTICE_DEAD,
    queue: QUEUE_NOTICE_DEAD,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
      messageTtl: 90 * 24 * 3600 * 1000,
    },
  })
  handleDead(data: NoticeMessagePayload): void {
    this.logger.error(
      `Notice ${data.noticeId} entered DLQ after ${data.retryCount} retries`,
    );
  }

  private isExpired(notice: {
    sendTime: Date | null;
    publishTime: Date | null;
    expireDays: number | null;
  }): boolean {
    if (!notice.expireDays) return false;
    const base = notice.sendTime ?? notice.publishTime;
    if (!base) return false;
    return Date.now() > base.getTime() + notice.expireDays * 86_400_000;
  }

  private async handleFailure(
    data: NoticeMessagePayload,
    error: unknown,
  ): Promise<Nack | void> {
    const msg = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `Notice ${data.noticeId} push failed (retry ${data.retryCount}): ${msg}`,
    );

    if (data.retryCount < MAX_RETRY) {
      const delay = RETRY_DELAYS[data.retryCount] ?? 60_000;
      try {
        await this.producer.send(
          { noticeId: data.noticeId, retryCount: data.retryCount + 1 },
          delay,
        );
        return;
      } catch (e) {
        this.logger.error(
          `Notice ${data.noticeId} retry message send failed: ${(e as Error).message}`,
        );
        // MQ 完全不可用，标记为失败，不 requeue 避免死循环
        await this.prisma.notice.update({
          where: { id: BigInt(data.noticeId) },
          data: { sendStatus: -1 },
        });
        return new Nack(false);
      }
    }

    await this.prisma.notice.update({
      where: { id: BigInt(data.noticeId) },
      data: { sendStatus: -1 },
    });
    return new Nack(false);
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
}
