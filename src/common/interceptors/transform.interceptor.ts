import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';

import { ApiResult } from '~/common/model/api.model';
import { bigintReplacer } from '~/common/utils/bigint';

export const RAW_RESPONSE_KEY = 'isRawResponse';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResult<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResult<T> | T> {
    if (context.getType() !== 'http') return next.handle();

    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((data) => {
        if (isRaw) return data;
        // logout 等接口可能返回 undefined，直接放行，避免 JSON.parse(undefined) 抛错
        if (data === undefined || data === null) {
          return ApiResult.success(data);
        }
        // BigInt 不能被 JSON.stringify 直接序列化，走 replacer 转 string
        const sanitized = JSON.parse(
          JSON.stringify(data, bigintReplacer),
        ) as unknown as T;
        return ApiResult.success(sanitized);
      }),
    );
  }
}

export function RawResponse() {
  return (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(
        RAW_RESPONSE_KEY,
        true,
        descriptor.value as object,
      );
      return descriptor;
    }
    Reflect.defineMetadata(RAW_RESPONSE_KEY, true, target);
    return target;
  };
}
