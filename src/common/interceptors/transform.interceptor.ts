import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { map, Observable } from 'rxjs'

import { ApiResult } from '~/common/model/api.model'

export const RAW_RESPONSE_KEY = 'isRawResponse'

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResult<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResult<T> | T> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    return next.handle().pipe(
      map((data) => {
        if (isRaw)
          return data
        return ApiResult.success(data)
      }),
    )
  }
}

export function RawResponse() {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(RAW_RESPONSE_KEY, true, descriptor.value)
      return descriptor
    }
    Reflect.defineMetadata(RAW_RESPONSE_KEY, true, target)
    return target
  }
}
