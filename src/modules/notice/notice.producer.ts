import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

import {
  EXCHANGE_NOTICE,
  ROUTING_KEY_NOTICE_PROCESS,
} from '~/shared/rabbitmq/rabbitmq.constants';
import { serializeBigInt } from '~/shared/rabbitmq/utils';

export interface NoticeMessagePayload {
  noticeId: string;
  retryCount: number;
}

@Injectable()
export class NoticeProducer {
  constructor(private amqpConnection: AmqpConnection) {}

  async send(
    payload: NoticeMessagePayload,
    delayMs: number = 0,
  ): Promise<void> {
    await this.amqpConnection.publish(
      EXCHANGE_NOTICE,
      ROUTING_KEY_NOTICE_PROCESS,
      serializeBigInt(payload),
      {
        persistent: true,
        headers: { 'x-delay': delayMs },
      },
    );
  }
}
