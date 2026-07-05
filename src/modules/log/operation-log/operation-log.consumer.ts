import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

import { AppLogger } from '~/common/logger/app-logger';
import {
  EXCHANGE_LOG,
  EXCHANGE_LOG_DLX,
  QUEUE_OPERATION_LOG,
  QUEUE_OPERATION_LOG_DLQ,
  ROUTING_KEY_OPERATION_LOG,
  ROUTING_KEY_OPERATION_LOG_DLQ,
} from '~/shared/rabbitmq/rabbitmq.constants';

import {
  OperationLogRecord,
  OperationLogService,
} from './operation-log.service';

@Injectable()
export class OperationLogConsumer {
  constructor(
    private operationLogService: OperationLogService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(OperationLogConsumer.name);
  }

  @RabbitSubscribe({
    exchange: EXCHANGE_LOG,
    routingKey: ROUTING_KEY_OPERATION_LOG,
    queue: QUEUE_OPERATION_LOG,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
      deadLetterExchange: EXCHANGE_LOG_DLX,
      deadLetterRoutingKey: ROUTING_KEY_OPERATION_LOG_DLQ,
    },
  })
  async handleOperationLog(data: OperationLogRecord): Promise<void> {
    try {
      await this.operationLogService.record(data);
      this.logger.debug(`Operation log recorded: ${data.method} ${data.path}`);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error(`Failed to process operation log: ${err.message}`, {
        error: err,
      });
      throw e;
    }
  }

  @RabbitSubscribe({
    exchange: EXCHANGE_LOG_DLX,
    routingKey: ROUTING_KEY_OPERATION_LOG_DLQ,
    queue: QUEUE_OPERATION_LOG_DLQ,
    createQueueIfNotExists: true,
    queueOptions: { durable: true },
  })
  handleOperationLogDLQ(data: unknown): void {
    this.logger.warn(`Operation log dead letter: ${JSON.stringify(data)}`);
  }
}
