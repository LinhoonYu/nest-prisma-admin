import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
      await this.sessionService.revokeByUser(user.userId);
    }

    const sessionId = await this.sessionService.create(user.userId);
    const accessToken = this.tokenService.signAccess(user.userId, sessionId);
    const refreshToken = await this.tokenService.signRefresh(
      user.userId,
      sessionId,
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

  async logout(sessionId: string) {
    await this.sessionService.revoke(sessionId);
  }

  async logoutAll(userId: string) {
    await this.sessionService.revokeByUser(userId);
  }

  async profile(userId: string) {
    const user = await this.userContextService.getUser(userId);
    if (!user) {
      throw new ApiException(ApiCode.UserNotFound, '用户不存在');
    }

    const [roles, permissions, avatarUrl] = await Promise.all([
      this.userContextService.getRoleCodes(userId),
      this.userContextService.getPermissionCodes(userId),
      user.avatarFileId ? Promise.resolve(null) : this.getOAuthAvatar(userId),
    ]);

    return { ...user, roles, permissions, avatarUrl };
  }

  private async getOAuthAvatar(userId: string): Promise<string | null> {
    const identity = await this.prisma.userIdentity.findFirst({
      where: {
        userId: BigInt(userId),
        deletedId: 0n,
        providerAvatar: { not: null },
      },
      select: { providerAvatar: true },
      orderBy: { linkedAt: 'asc' },
    });
    return identity?.providerAvatar ?? null;
  }
}
