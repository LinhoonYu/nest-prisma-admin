// RabbitMQ Exchange 定义
export const EXCHANGE_LOG = 'log.exchange';
export const EXCHANGE_LOG_DLX = 'log.dlx';

// RabbitMQ Queue 定义
export const QUEUE_OPERATION_LOG = 'log.operation.queue';
export const QUEUE_OPERATION_LOG_DLQ = 'log.operation.dlq';
export const QUEUE_LOGIN_LOG = 'log.login.queue';
export const QUEUE_LOGIN_LOG_DLQ = 'log.login.dlq';

// Routing Key 定义
export const ROUTING_KEY_OPERATION_LOG = 'log.operation';
export const ROUTING_KEY_LOGIN_LOG = 'log.login';

// 死信 Routing Key 定义
export const ROUTING_KEY_OPERATION_LOG_DLQ = 'log.operation.dead';
export const ROUTING_KEY_LOGIN_LOG_DLQ = 'log.login.dead';
