import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { I18nService } from 'nestjs-i18n';

import { ApiResult } from '~/common/model/api.model';
import { bigintReplacer } from '~/common/utils/bigint';

export const RAW_RESPONSE_KEY = 'isRawResponse';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResult<T> | T
> {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18n: I18nService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResult<T> | T> {
    if (context.getType() !== 'http') return next.handle();

    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const successMessage = String(this.i18n.t('common.SUCCESS'));

    return next.handle().pipe(
      map((data) => {
        if (isRaw) return data;
        if (data === undefined || data === null) {
          return ApiResult.success(data, successMessage);
        }
        const sanitized = JSON.parse(
          JSON.stringify(data, bigintReplacer),
        ) as unknown as T;
        return new ApiResult(0, successMessage, sanitized);
      }),
    );
  }
}

export function RawResponse(): MethodDecorator & ClassDecorator {
  return ((
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
  }) as MethodDecorator & ClassDecorator;
}
