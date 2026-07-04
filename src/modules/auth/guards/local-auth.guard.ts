import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FastifyRequest } from 'fastify';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { ISecurityConfig, SecurityConfig } from '~/config';

import { CaptchaService } from '../captcha.service';
import { LOGIN_TYPE_PASSWORD } from '../auth.constants';
import type { LoginDto } from '../dto/login.dto';

/** 登录失败事件的 payload（与 LoginEventPayload 兼容） */
interface LoginFailurePayload {
  username: string;
  loginType: number;
  ip: string;
  userAgent: string;
  status: 0;
  failureReason: string;
}

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor(
    private readonly captchaService: CaptchaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(SecurityConfig.KEY)
    private readonly securityConfig: ISecurityConfig,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const body = request.body as Partial<LoginDto>;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';

    try {
      // 验证码前置校验
      if (this.securityConfig.captcha.enabled) {
        if (!body.captchaKey || !body.captchaCode) {
          throw new ApiException(ApiCode.CaptchaError, '请输入验证码');
        }
        await this.captchaService.verify(body.captchaKey, body.captchaCode);
      }

      // 执行 passport-local 认证
      await super.canActivate(context);
      return true;
    } catch (e) {
      this.emitLoginFailure(body, ip, userAgent, e);
      throw e;
    }
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | undefined,
  ): TUser {
    if (err || !user) {
      throw (
        err ||
        new ApiException(
          ApiCode.AccountOrPasswordError,
          info?.message || '用户名或密码错误',
        )
      );
    }
    return user;
  }

  private emitLoginFailure(
    body: Partial<LoginDto>,
    ip: string,
    userAgent: string,
    error: unknown,
  ): void {
    const payload: LoginFailurePayload = {
      username: body.username || 'unknown',
      loginType: LOGIN_TYPE_PASSWORD,
      ip,
      userAgent,
      status: 0,
      failureReason: error instanceof Error ? error.message : String(error),
    };
    this.eventEmitter.emit('auth.login', payload);
  }
}
