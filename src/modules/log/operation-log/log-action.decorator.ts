import { SetMetadata } from '@nestjs/common';

export const LOG_ACTION_KEY = 'logAction';

export interface LogActionOptions {
  /** 业务模块名，如 '用户管理' */
  module?: string;
  /** 操作名，如 '新增' */
  action?: string;
  /** 描述，如 '新增用户' */
  description?: string;
  /** 是否记录请求参数（query），默认 true */
  logParams?: boolean;
  /** 是否记录请求体，默认 true */
  logBody?: boolean;
}

/**
 * 标记该接口需要记录操作日志。
 * 默认只对写操作（POST/PUT/PATCH/DELETE）采集，
 * GET 接口需显式标记才会记录。
 */
export const LogAction = (options: LogActionOptions = {}) =>
  SetMetadata(LOG_ACTION_KEY, options);

export const SKIP_OPERATION_LOG_KEY = 'skipOperationLog';

/**
 * 跳过操作日志记录，可用于控制器或方法级别。
 * 登录、登出等认证接口已有独立的登录日志，无需重复记录。
 */
export const SkipOperationLog = () => SetMetadata(SKIP_OPERATION_LOG_KEY, true);
