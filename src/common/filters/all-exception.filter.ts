import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

import { ApiException } from '~/common/exceptions/api.exception';
import { AppLogger } from '~/common/logger/app-logger';

interface ErrorResponse {
  code: number;
  message: string;
  data?: unknown;
}

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(AllExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    // 非 HTTP 上下文（如 RabbitMQ 消费者）只记录日志，不尝试发送 HTTP 响应
    if (host.getType() !== 'http') {
      const message =
        exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        message,
        exception instanceof Error ? { error: exception } : undefined,
      );
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse: ErrorResponse = {
      code: 1,
      message: '服务器内部错误',
    };

    if (exception instanceof ApiException) {
      status = HttpStatus.OK;
      errorResponse.code = exception.code;
      errorResponse.message = exception.message;
      errorResponse.data = exception.data;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        errorResponse.message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        errorResponse.code = typeof r.code === 'number' ? r.code : status;
        errorResponse.message =
          typeof r.message === 'string' ? r.message : '请求错误';
        errorResponse.data = r.data;
      }
    } else if (exception instanceof Error) {
      errorResponse.message = exception.message;
      this.logger.error(`${request.method} ${request.url}`, {
        error: exception,
      });
    }

    response.status(status).send(errorResponse);
  }
}
