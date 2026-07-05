import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

import { AppLogger } from '~/common/logger/app-logger';
import {
  EXCHANGE_LOG,
  EXCHANGE_LOG_DLX,
  QUEUE_LOGIN_LOG,
  QUEUE_LOGIN_LOG_DLQ,
  ROUTING_KEY_LOGIN_LOG,
  ROUTING_KEY_LOGIN_LOG_DLQ,
} from '~/shared/rabbitmq/rabbitmq.constants';

import { LoginLogRecord, LoginLogService } from './login-log.service';

@Injectable()
export class LoginLogConsumer {
  constructor(
    private loginLogService: LoginLogService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(LoginLogConsumer.name);
  }

  @RabbitSubscribe({
    exchange: EXCHANGE_LOG,
    routingKey: ROUTING_KEY_LOGIN_LOG,
    queue: QUEUE_LOGIN_LOG,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
      deadLetterExchange: EXCHANGE_LOG_DLX,
      deadLetterRoutingKey: ROUTING_KEY_LOGIN_LOG_DLQ,
    },
  })
  async handleLoginLog(data: LoginLogRecord): Promise<void> {
    try {
      await this.loginLogService.record(data);
      this.logger.debug(
        `Login log recorded: ${data.username} ${data.status === 1 ? 'success' : 'failed'}`,
      );
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error(`Failed to process login log: ${err.message}`, {
        error: err,
      });
      throw e;
    }
  }

  @RabbitSubscribe({
    exchange: EXCHANGE_LOG_DLX,
    routingKey: ROUTING_KEY_LOGIN_LOG_DLQ,
    queue: QUEUE_LOGIN_LOG_DLQ,
    createQueueIfNotExists: true,
    queueOptions: { durable: true },
  })
  handleLoginLogDLQ(data: unknown): void {
    this.logger.warn(`Login log dead letter: ${JSON.stringify(data)}`);
  }
}
