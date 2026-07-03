import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UAParser } from 'ua-parser-js';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { IAppConfig, AppConfig } from '~/config';
import { ISecurityConfig, SecurityConfig } from '~/config';
import { PrismaService } from '~/shared/prisma/prisma.service';

import { CaptchaService } from './captcha.service';
import { LoginDto } from './dto/login.dto';
import { PublicKeyVo } from './dto/public-key.dto';
import { PasswordService } from './password.service';
import { RsaService } from './rsa.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { UserContextService } from './user-context.service';

const LOGIN_TYPE_PASSWORD = 1;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private captchaService: CaptchaService,
    private passwordService: PasswordService,
    private rsaService: RsaService,
    private sessionService: SessionService,
    private tokenService: TokenService,
    private userContextService: UserContextService,
    private eventEmitter: EventEmitter2,
    @Inject(AppConfig.KEY) private appConfig: IAppConfig,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
  ) {}

  captcha() {
    return this.captchaService.generate();
  }

  async generatePublicKey(): Promise<PublicKeyVo> {
    return this.rsaService.getPublicKey();
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    try {
      if (this.securityConfig.captcha.enabled) {
        if (!dto.captchaKey || !dto.captchaCode) {
          throw new ApiException(ApiCode.CaptchaError, '请输入验证码');
        }
        await this.captchaService.verify(dto.captchaKey, dto.captchaCode);
      }

      const user = await this.prisma.user.findFirst({
        where: { username: dto.username, deletedId: 0n },
      });
      if (!user) {
        throw new ApiException(
          ApiCode.AccountOrPasswordError,
          '用户名或密码错误',
        );
      }

      if (user.status === 0) {
        throw new ApiException(ApiCode.AccountDisabled, '账号已禁用');
      }

      // RSA 启用时解密 encPassword，否则用明文 password
      if (this.securityConfig.rsa.enabled) {
        if (!dto.encPassword) {
          throw new ApiException(ApiCode.BadRequest, '加密密码不能为空');
        }
        dto.password = await this.rsaService.decrypt(dto.encPassword);
      } else if (!dto.password) {
        throw new ApiException(ApiCode.BadRequest, '密码不能为空');
      }

      if (await this.passwordService.isLocked(user.id)) {
        const minutes = await this.passwordService.getLockedRemainingMinutes(
          user.id,
        );
        throw new ApiException(
          ApiCode.AccountLocked,
          `账号已锁定，请 ${minutes} 分钟后重试`,
        );
      }

      const credential = await this.passwordService.getCredential(user.id);
      const verified = await this.passwordService.compare(
        dto.password,
        credential.passwordHash,
      );
      if (!verified) {
        await this.passwordService.recordFailure(user.id);
        throw new ApiException(
          ApiCode.AccountOrPasswordError,
          '用户名或密码错误',
        );
      }

      await this.passwordService.recordSuccess(user.id);

      if (!this.appConfig.multiDeviceLogin) {
        await this.sessionService.revokeByUser(user.id, 'Single device login');
      }

      const deviceName = this.parseDeviceName(userAgent);
      const session = await this.sessionService.create({
        userId: user.id,
        loginType: LOGIN_TYPE_PASSWORD,
        ip,
        userAgent,
        deviceName,
      });

      const userIdStr = user.id.toString();
      const sessionIdStr = session.toString();
      const familyId = sessionIdStr;

      const accessToken = this.tokenService.signAccess(userIdStr, sessionIdStr);
      const refreshToken = await this.tokenService.signRefresh(
        userIdStr,
        sessionIdStr,
        familyId,
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
        },
      });

      this.eventEmitter.emit('auth.login', {
        userId: user.id,
        username: user.username,
        loginType: LOGIN_TYPE_PASSWORD,
        ip,
        userAgent,
        status: 1,
      });

      return {
        accessToken,
        refreshToken,
        mustChangePassword: credential.mustChangePassword,
      };
    } catch (e) {
      // 登录失败也记录日志
      this.eventEmitter.emit('auth.login', {
        username: dto.username,
        loginType: LOGIN_TYPE_PASSWORD,
        ip,
        userAgent,
        status: 0,
        failureReason: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
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
