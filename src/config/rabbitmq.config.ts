import { ConfigType, registerAs } from '@nestjs/config';

import { env } from '~/global/env';

export const rabbitmqRegToken = 'rabbitmq';

export const RabbitmqConfig = registerAs(rabbitmqRegToken, () => ({
  uri: env('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
  prefetchCount: 10,
}));

export type IRabbitmqConfig = ConfigType<typeof RabbitmqConfig>;
