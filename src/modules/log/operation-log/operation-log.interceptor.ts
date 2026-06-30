import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { JwtPayload } from '~/common/decorators/current-user.decorator';

import { LOG_ACTION_KEY, LogActionOptions } from './log-action.decorator';
import {
  OperationLogRecord,
  OperationLogService,
} from './operation-log.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** 请求体过大不记录，防止日志爆炸 */
const MAX_BODY_LENGTH = 8192;

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly operationLogService: OperationLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<LogActionOptions>(
      LOG_ACTION_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = request.method.toUpperCase();

    // 无装饰器且非写操作，跳过
    if (!options && !WRITE_METHODS.has(method)) {
      return next.handle();
    }

    const merged: LogActionOptions = {
      logParams: true,
      logBody: true,
      ...options,
    };

    const startedAt = Date.now();
    const user = request.user;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<FastifyReply>();
          this.write(
            request,
            response.statusCode,
            true,
            undefined,
            startedAt,
            user,
            merged,
          ).catch(() => {});
        },
        error: (err: unknown) => {
          this.write(request, 500, false, err, startedAt, user, merged).catch(
            () => {},
          );
        },
      }),
    );
  }

  private async write(
    request: FastifyRequest,
    statusCode: number,
    success: boolean,
    err: unknown,
    startedAt: number,
    user: JwtPayload | undefined,
    options: LogActionOptions,
  ): Promise<void> {
    const method = request.method.toUpperCase();
    const userAgent = request.headers['user-agent'] ?? undefined;
    const durationMs = Date.now() - startedAt;

    let requestBody: unknown = undefined;
    if (options.logBody && request.body != null) {
      requestBody = this.truncate(request.body);
    }

    let requestParams: unknown = undefined;
    if (options.logParams && request.query != null) {
      requestParams = this.truncate(request.query);
    }

    const record: OperationLogRecord = {
      userId: user ? BigInt(user.userId) : undefined,
      username: undefined, // 由调用方在登录后补充，或后续接 UserContextService
      module: options.module,
      action: options.action,
      description: options.description,
      method,
      path: request.url,
      ip: request.ip,
      userAgent,
      requestParams,
      requestBody,
      statusCode,
      success,
      errorMessage: err ? (err as Error).message : undefined,
      durationMs,
    };

    await this.operationLogService.record(record);
  }

  /** 超长内容截断，避免单个日志记录过大 */
  private truncate(data: unknown): unknown {
    try {
      const str = JSON.stringify(data);
      if (str && str.length > MAX_BODY_LENGTH) {
        return { _truncated: true, preview: str.slice(0, MAX_BODY_LENGTH) };
      }
      return data;
    } catch {
      return { _serializable: false };
    }
  }
}
