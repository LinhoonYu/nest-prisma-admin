import { WinstonModuleOptions, utilities } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { isDev } from '~/global/env';

// Error 对象的 message/stack 是不可枚举属性，JSON.stringify 会丢失。
// 此 format 显式展开 meta.error 中的 Error，保留 message/stack/自定义字段。
const errorMetaFormat = winston.format((info) => {
  if (info.error instanceof Error) {
    const { message, stack, ...rest } = info.error;
    info.error = { message, stack, ...rest };
  }
  return info;
});

// winston transport 的 level 是"及以上"过滤，这里精确匹配单一等级
const levelFilter = (target: string) =>
  winston.format((info) => (info.level === target ? info : false))();

export function createWinstonConfig(): WinstonModuleOptions {
  const dir = process.env.LOG_DIR || 'logs';
  const maxSize = process.env.LOG_MAX_SIZE || '20m';
  const maxFiles = process.env.LOG_MAX_FILES || '30d';
  const zippedArchive = process.env.LOG_ZIPPED !== 'false';
  const level = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errorMetaFormat(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  const consoleFormat = isDev
    ? winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errorMetaFormat(),
        winston.format.errors({ stack: true }),
        utilities.format.nestLike('nest-prisma-admin', {
          colors: true,
          prettyPrint: true,
        }),
      )
    : fileFormat;

  const createLevelTransport = (targetLevel: string) =>
    new DailyRotateFile({
      level: targetLevel,
      dirname: dir,
      filename: `${targetLevel}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive,
      maxSize,
      maxFiles,
      format: winston.format.combine(levelFilter(targetLevel), fileFormat),
    });

  return {
    level,
    transports: [
      new winston.transports.Console({ format: consoleFormat }),
      createLevelTransport('error'),
      createLevelTransport('warn'),
      createLevelTransport('info'),
      createLevelTransport('debug'),
    ],
    exceptionHandlers: [
      new DailyRotateFile({
        dirname: dir,
        filename: 'exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive,
        maxSize,
        maxFiles,
        format: fileFormat,
      }),
    ],
    rejectionHandlers: [
      new DailyRotateFile({
        dirname: dir,
        filename: 'rejections-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive,
        maxSize,
        maxFiles,
        format: fileFormat,
      }),
    ],
    exitOnError: true,
  };
}

let winstonInstance: winston.Logger | null = null;

// 供 main.ts（bootstrap 阶段）和 RedisIoAdapter（非 DI 场景）使用，
// 保证全局只有一个 winston 实例，避免多个 DailyRotateFile transport 写同一文件。
export function getWinstonInstance(): winston.Logger {
  if (!winstonInstance) {
    winstonInstance = winston.createLogger(createWinstonConfig());
  }
  return winstonInstance;
}
