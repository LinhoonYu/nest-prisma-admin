import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

/**
 * JWT Payload — 仅存不可变标识。
 * username/roles/isSuperAdmin 等可变信息不进 token，请通过 UserContextService 实时查库/缓存获取。
 */
export interface JwtPayload {
  userId: string;
  sessionId: string;
}

// Passport 在认证成功后将 payload 挂到 request.user 上
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * 从 JWT 认证后的 request.user 中提取当前用户信息。
 *
 * @example
 * @CurrentUser()              → 完整 JwtPayload
 * @CurrentUser('userId')      → '1'
 * @CurrentUser('sessionId')   → '42'
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | string | undefined => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const payload = request.user;
    return data ? (payload ? payload[data] : undefined) : payload;
  },
);
