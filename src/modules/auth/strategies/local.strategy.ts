import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { ISecurityConfig, SecurityConfig } from '~/config';
import { PrismaService } from '~/shared/prisma/prisma.service';

import { PasswordService } from '../password.service';
import { RsaService } from '../rsa.service';

/** LocalStrategy 认证成功后挂到 request.user 上的对象 */
export interface LocalUser {
  userId: string;
  username: string;
  mustChangePassword: boolean;
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly rsaService: RsaService,
    @Inject(SecurityConfig.KEY)
    private readonly securityConfig: ISecurityConfig,
  ) {
    super({ usernameField: 'username', passwordField: 'password' });
  }

  async validate(username: string, password: string): Promise<LocalUser> {
    const user = await this.prisma.user.findFirst({
      where: { username, deletedId: 0n },
    });
    if (!user) {
      throw new ApiException(ApiCode.AccountOrPasswordError);
    }

    if (user.status === 0) {
      throw new ApiException(ApiCode.AccountDisabled);
    }

    if (await this.passwordService.isLocked(user.id)) {
      const minutes = await this.passwordService.getLockedRemainingMinutes(
        user.id,
      );
      throw new ApiException(ApiCode.AccountLocked, {
        minutes: String(minutes),
      });
    }

    // RSA 启用时 password 是密文，关闭时是明文
    let plainPassword: string;
    if (this.securityConfig.rsa.enabled) {
      plainPassword = await this.rsaService.decrypt(password);
    } else {
      plainPassword = password;
    }

    const credential = await this.passwordService.getCredential(user.id);
    const verified = await this.passwordService.compare(
      plainPassword,
      credential.passwordHash,
    );
    if (!verified) {
      await this.passwordService.recordFailure(user.id);
      throw new ApiException(ApiCode.AccountOrPasswordError);
    }

    await this.passwordService.recordSuccess(user.id);

    return {
      userId: user.id.toString(),
      username: user.username,
      mustChangePassword: credential.mustChangePassword,
    };
  }
}
