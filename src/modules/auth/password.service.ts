import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { ISecurityConfig, SecurityConfig } from '~/config';
import { PrismaService } from '~/shared/prisma/prisma.service';

const SALT_ROUNDS = 10;

@Injectable()
export class PasswordService {
  constructor(
    private prisma: PrismaService,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
  ) {}

  hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  }

  compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  async getCredential(userId: bigint) {
    const credential = await this.prisma.userCredential.findUnique({
      where: { userId },
    });
    if (!credential) {
      throw new ApiException(ApiCode.AccountNotFound, '账号不存在');
    }
    return credential;
  }

  async isLocked(userId: bigint): Promise<boolean> {
    const credential = await this.prisma.userCredential.findUnique({
      where: { userId },
      select: { lockedUntil: true },
    });
    if (!credential?.lockedUntil) return false;
    return credential.lockedUntil > new Date();
  }

  async getLockedRemainingMinutes(userId: bigint): Promise<number> {
    const credential = await this.prisma.userCredential.findUnique({
      where: { userId },
      select: { lockedUntil: true },
    });
    if (!credential?.lockedUntil) return 0;
    const remaining = credential.lockedUntil.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 60000));
  }

  async recordFailure(userId: bigint): Promise<void> {
    const { threshold, duration } = this.securityConfig.lock;
    const credential = await this.prisma.userCredential.findUnique({
      where: { userId },
      select: { failedAttempts: true },
    });
    if (!credential) return;

    const attempts = credential.failedAttempts + 1;
    const shouldLock = attempts >= threshold;

    await this.prisma.userCredential.update({
      where: { userId },
      data: {
        failedAttempts: attempts,
        ...(shouldLock && {
          lockedUntil: new Date(Date.now() + duration * 60 * 1000),
        }),
      },
    });
  }

  async recordSuccess(userId: bigint): Promise<void> {
    await this.prisma.userCredential.update({
      where: { userId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
  }
}
