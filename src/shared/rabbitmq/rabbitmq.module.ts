import { Global, Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

import { IRabbitmqConfig, RabbitmqConfig } from '~/config';

import {
  EXCHANGE_LOG,
  EXCHANGE_LOG_DLX,
  EXCHANGE_NOTICE,
  EXCHANGE_NOTICE_DLX,
} from './rabbitmq.constants';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [RabbitmqConfig.KEY],
      useFactory: (config: IRabbitmqConfig) => ({
        uri: config.uri,
        prefetchCount: config.prefetchCount,
        exchanges: [
          {
            name: EXCHANGE_LOG,
            type: 'direct',
            durable: true,
          },
          {
            name: EXCHANGE_LOG_DLX,
            type: 'direct',
            durable: true,
          },
          {
            name: EXCHANGE_NOTICE,
            type: 'x-delayed-message',
            options: {
              durable: true,
              arguments: { 'x-delayed-type': 'direct' },
            },
          },
          {
            name: EXCHANGE_NOTICE_DLX,
            type: 'direct',
            durable: true,
          },
        ],
        // 队列由 @RabbitSubscribe 装饰器声明，不在此处配置
        connectionInitOptions: { wait: true, timeout: 10000 },
        connectionManagerOptions: {
          heartbeatIntervalInSeconds: 30,
          reconnectTimeInSeconds: 5,
        },
      }),
    }),
  ],
  exports: [RabbitMQModule],
})
export class RabbitmqModule {}
