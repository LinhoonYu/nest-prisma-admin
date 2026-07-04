import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UAParser } from 'ua-parser-js';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { IAppConfig, AppConfig } from '~/config';
import { PrismaService } from '~/shared/prisma/prisma.service';

import { LOGIN_TYPE_PASSWORD } from './auth.constants';
import { CaptchaService } from './captcha.service';
import { PublicKeyVo } from './dto/public-key.dto';
import { RsaService } from './rsa.service';
import { SessionService } from './session.service';
import type { LocalUser } from './strategies/local.strategy';
import { TokenService } from './token.service';
import { UserContextService } from './user-context.service';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private captchaService: CaptchaService,
    private rsaService: RsaService,
    private sessionService: SessionService,
    private tokenService: TokenService,
    private userContextService: UserContextService,
    private eventEmitter: EventEmitter2,
    @Inject(AppConfig.KEY) private appConfig: IAppConfig,
  ) {}

  captcha() {
    return this.captchaService.generate();
  }

  async generatePublicKey(): Promise<PublicKeyVo> {
    return this.rsaService.getPublicKey();
  }

  async login(
    user: LocalUser,
    ip: string,
    userAgent: string,
  ): Promise<LoginResult> {
    const userId = BigInt(user.userId);

    if (!this.appConfig.multiDeviceLogin) {
      await this.sessionService.revokeByUser(userId, 'Single device login');
    }

    const deviceName = this.parseDeviceName(userAgent);
    const session = await this.sessionService.create({
      userId,
      loginType: LOGIN_TYPE_PASSWORD,
      ip,
      userAgent,
      deviceName,
    });

    const sessionIdStr = session.toString();
    const accessToken = this.tokenService.signAccess(user.userId, sessionIdStr);
    const refreshToken = await this.tokenService.signRefresh(
      user.userId,
      sessionIdStr,
      sessionIdStr,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    this.eventEmitter.emit('auth.login', {
      userId,
      username: user.username,
      loginType: LOGIN_TYPE_PASSWORD,
      ip,
      userAgent,
      status: 1,
    });

    return {
      accessToken,
      refreshToken,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async refresh(refreshToken: string) {
    return this.tokenService.rotateRefresh(refreshToken);
  }

  async logout(userId: string, sessionId: string, accessToken: string) {
    await this.sessionService.revoke(BigInt(sessionId), 'User logout');
    await this.tokenService.blacklistAccess(accessToken);
  }

  async logoutAll(userId: string, accessToken: string) {
    await this.sessionService.revokeByUser(
      BigInt(userId),
      'Logout all devices',
    );
    await this.tokenService.blacklistAccess(accessToken);
  }

  async profile(userId: string) {
    const user = await this.userContextService.getUser(userId);
    if (!user) {
      throw new ApiException(ApiCode.UserNotFound, '用户不存在');
    }

    const [roles, permissions] = await Promise.all([
      this.userContextService.getRoleCodes(userId),
      this.userContextService.getPermissionCodes(userId),
    ]);

    return { ...user, roles, permissions };
  }

  private parseDeviceName(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser().name || 'Unknown';
    const os = parser.getOS().name || 'Unknown';
    return `${browser} on ${os}`;
  }
}
