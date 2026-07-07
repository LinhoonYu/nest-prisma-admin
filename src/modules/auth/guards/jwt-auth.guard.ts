import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';

import { JwtPayload } from '~/common/decorators/current-user.decorator';
import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { PERM_KEY } from '~/common/decorators/perm.decorator';
import { PUBLIC_KEY } from '~/common/decorators/public.decorator';
import { UserContextService } from '../user-context.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private userContextService: UserContextService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new ApiException(ApiCode.TokenMissing);
    }

    await super.canActivate(context);

    const permCodes = this.reflector.getAllAndOverride<string[]>(PERM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permCodes || permCodes.length === 0) return true;

    const payload = request.user as JwtPayload;
    if (await this.userContextService.isSuperAdmin(payload.userId)) {
      return true;
    }

    const userPerms = await this.userContextService.getPermissionCodes(
      payload.userId,
    );
    if (!permCodes.some((code) => userPerms.includes(code))) {
      throw new ApiException(ApiCode.NoPermission);
    }

    return true;
  }

  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      throw new ApiException(ApiCode.TokenInvalid);
    }
    return user as TUser;
  }

  private extractToken(request: FastifyRequest): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
