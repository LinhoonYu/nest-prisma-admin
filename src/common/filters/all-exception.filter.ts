import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { I18nService } from 'nestjs-i18n';

import { ApiCode } from '~/common/exceptions/error-code';
import { ApiException } from '~/common/exceptions/api.exception';
import { AppLogger } from '~/common/logger/app-logger';

interface ErrorResponse {
  code: number;
  message: string;
  data?: unknown;
}

/** ApiCode 数字码 → UPPER_SNAKE_CASE i18n key */
function resolveI18nKey(code: number): string {
  const enumName = ApiCode[code];
  if (!enumName) return 'common.INTERNAL_ERROR';

  // Success / Error / InternalServerError 映射到 common.*
  if (enumName === 'Success') return 'common.SUCCESS';
  if (enumName === 'Error' || enumName === 'InternalServerError')
    return 'common.INTERNAL_ERROR';

  // 业务码：PascalCase → UPPER_SNAKE_CASE
  const key = enumName
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .replace('O_AUTH', 'OAUTH');
  return `errors.${key}`;
}

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly i18n: I18nService,
  ) {
    this.logger.setContext(AllExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      const msg =
        exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        msg,
        exception instanceof Error ? { error: exception } : undefined,
      );
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 1;
    let message = this.t('common.INTERNAL_ERROR');

    if (exception instanceof ApiException) {
      status = HttpStatus.OK;
      code = exception.code;
      const data = exception.data;
      const key = resolveI18nKey(code);
      message = exception.params
        ? this.t(key, { args: exception.params })
        : this.translateWithFallback(key);
      response
        .status(status)
        .send({ code, message, data } satisfies ErrorResponse);
      return;
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      let data: unknown;

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        code = typeof r.code === 'number' ? r.code : status;
        message =
          typeof r.message === 'string'
            ? r.message
            : this.t('common.BAD_REQUEST');
        data = r.data;
      }

      response
        .status(status)
        .send({ code, message, data } satisfies ErrorResponse);
      return;
    }

    if (exception instanceof Error) {
      this.logger.error(`${request.method} ${request.url}`, {
        error: exception,
      });
    }

    response.status(status).send({
      code,
      message: this.t('common.INTERNAL_ERROR'),
    } satisfies ErrorResponse);
  }

  /**
   * 翻译并返回纯字符串，消除 nestjs-i18n 返回类型歧义。
   * @param key 翻译 key
   * @param options 翻译选项
   */
  private t(key: string, options?: { args?: Record<string, unknown> }): string {
    return String(this.i18n.t(key, options));
  }

  /**
   * 翻译指定 key，若翻译缺失（返回 key 本身）则兜底返回内部错误消息。
   */
  private translateWithFallback(key: string): string {
    const translated = this.t(key);
    return translated !== key ? translated : this.t('common.INTERNAL_ERROR');
  }
}
