import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

import { AppLogger } from '~/common/logger/app-logger';
import {
  EXCHANGE_LOG,
  ROUTING_KEY_LOGIN_LOG,
} from '~/shared/rabbitmq/rabbitmq.constants';
import { serializeBigInt } from '~/shared/rabbitmq/utils';

import { LoginLogRecord } from './login-log.service';

/**
 * 登录日志生产者
 * 负责将登录日志发送到 RabbitMQ
 */
@Injectable()
export class LoginLogProducer {
  constructor(
    private amqpConnection: AmqpConnection,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(LoginLogProducer.name);
  }

  /** 发送登录日志到 MQ */
  async send(data: LoginLogRecord): Promise<void> {
    try {
      const payload = serializeBigInt(data);
      await this.amqpConnection.publish(
        EXCHANGE_LOG,
        ROUTING_KEY_LOGIN_LOG,
        payload,
        { persistent: true },
      );
    } catch (e) {
      this.logger.warn(
        `Failed to publish login log to MQ: ${(e as Error).message}.`,
      );
      throw e;
    }
  }
}
