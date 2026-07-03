import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { JwtPayload } from '~/common/decorators/current-user.decorator';
import { ApiException } from '~/common/exceptions/api.exception';
import { UserContextService } from '~/modules/auth/user-context.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

import {
  EXCHANGE_LOG,
  ROUTING_KEY_OPERATION_LOG,
} from '~/shared/rabbitmq/rabbitmq.constants';
import { serializeBigInt } from '~/shared/rabbitmq/utils';

import {
  LOG_ACTION_KEY,
  LogActionOptions,
  SKIP_OPERATION_LOG_KEY,
} from './log-action.decorator';
import {
  OperationLogRecord,
  OperationLogService,
} from './operation-log.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** 请求体过大不记录，防止日志爆炸 */
const MAX_BODY_LENGTH = 8192;

/** @ApiTags / @ApiOperation 元数据 key（@nestjs/swagger 内部常量） */
const SWAGGER_API_TAGS = 'swagger/apiUseTags';
const SWAGGER_API_OPERATION = 'swagger/apiOperation';

/** HTTP 方法 → 默认操作名 */
const ACTION_BY_METHOD: Record<string, string> = {
  POST: '新增',
  PUT: '修改',
  PATCH: '修改',
  DELETE: '删除',
  GET: '查询',
};

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OperationLogInterceptor.name);

  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly operationLogService: OperationLogService,
    private readonly userContextService: UserContextService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const isSkipped = this.reflector.getAllAndOverride<boolean>(
      SKIP_OPERATION_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isSkipped) return next.handle();

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

    // 无显式 @LogAction 时，从 @ApiTags / @ApiOperation / HTTP 方法自动推导
    const handler = context.getHandler();
    const controllerClass = context.getClass();
    const module = merged.module ?? this.resolveModule(controllerClass);
    const action = merged.action ?? ACTION_BY_METHOD[method];
    const description = merged.description ?? this.resolveDescription(handler);

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
            { ...merged, module, action, description },
          ).catch(() => {});
        },
        error: (err: unknown) => {
          // 与 AllExceptionFilter 的状态码逻辑保持一致
          const statusCode =
            err instanceof ApiException
              ? HttpStatus.OK
              : err instanceof HttpException
                ? err.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;
          this.write(request, statusCode, false, err, startedAt, user, {
            ...merged,
            module,
            action,
            description,
          }).catch(() => {});
        },
      }),
    );
  }

  /** 从 @ApiTags 读取模块名，回退到控制器类名 */
  private resolveModule(
    controllerClass: new (...args: unknown[]) => unknown,
  ): string {
    const tags = this.reflector.get<string[]>(
      SWAGGER_API_TAGS,
      controllerClass,
    );
    if (tags && tags.length > 0) return tags[0];
    return controllerClass.name.replace(/Controller$/, '');
  }

  /** 从 @ApiOperation.summary 读取描述 */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private resolveDescription(handler: Function): string | undefined {
    const operation = this.reflector.get<{ summary?: string }>(
      SWAGGER_API_OPERATION,
      handler,
    );
    return operation?.summary || undefined;
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
    // 所有 request 属性必须在 await 之前同步读取，
    // Fastify 响应发送后会回收 request 对象，await 之后再访问会得到空值
    const method = request.method.toUpperCase();
    const userAgent = request.headers['user-agent'] ?? undefined;
    const ip = request.ip;
    const url = request.url;
    const durationMs = Date.now() - startedAt;

    let requestBody: unknown = undefined;
    if (options.logBody && request.body != null) {
      requestBody = this.truncate(request.body);
    }

    let requestParams: unknown = undefined;
    if (options.logParams && request.query != null) {
      requestParams = this.truncate(request.query);
    }

    // 通过 UserContextService 解析用户名（走 Redis 缓存）
    let username: string | undefined;
    if (user) {
      try {
        const cachedUser = await this.userContextService.getUser(user.userId);
        username = cachedUser?.username;
      } catch {
        // 查询失败不阻断日志写入
      }
    }

    const record: OperationLogRecord = {
      userId: user ? BigInt(user.userId) : undefined,
      username,
      module: options.module,
      action: options.action,
      description: options.description,
      method,
      path: url,
      ip,
      userAgent,
      requestParams,
      requestBody,
      statusCode,
      success,
      errorMessage: err ? (err as Error).message : undefined,
      durationMs,
    };

    const payload = serializeBigInt(record);

    try {
      await this.amqpConnection.publish(
        EXCHANGE_LOG,
        ROUTING_KEY_OPERATION_LOG,
        payload,
        { persistent: true },
      );
    } catch (e) {
      // MQ 不可用时降级为同步写入，保证日志不丢
      this.logger.warn(
        `Failed to publish operation log to MQ: ${(e as Error).message}. Falling back to direct record.`,
      );
      // 降级：直接写入数据库
      await this.operationLogService.record(record);
    }
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
