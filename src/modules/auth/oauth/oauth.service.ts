import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomBytes } from 'crypto';
import { UAParser } from 'ua-parser-js';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { IOauthConfig, OauthConfig } from '~/config';
import type { Prisma } from '~/generated/prisma/client';
import { PrismaService } from '~/shared/prisma/prisma.service';
import { RedisService } from '~/shared/redis/redis.service';

import { LOGIN_TYPE_OAUTH } from '../auth.constants';
import { SessionService } from '../session.service';
import { TokenService } from '../token.service';
import {
  OAUTH_EXCHANGE_PREFIX,
  OAUTH_PROVIDERS,
  OAUTH_STATE_PREFIX,
} from './oauth.constants';
import type {
  AuthUrlResponse,
  NormalizedOAuthUser,
  OAuthExchangePayload,
  OAuthLoginResult,
  OAuthStateContext,
} from './oauth.types';
import type { OAuthProviderStrategy } from './providers/oauth-provider.interface';

function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function generateRandomToken(): string {
  return randomBytes(32).toString('base64url');
}

function parseDeviceName(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser().name || 'Unknown';
  const os = parser.getOS().name || 'Unknown';
  return `${browser} on ${os}`;
}

@Injectable()
export class OAuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private sessionService: SessionService,
    private tokenService: TokenService,
    private eventEmitter: EventEmitter2,
    @Inject(OauthConfig.KEY) private oauthConfig: IOauthConfig,
    @Inject(OAUTH_PROVIDERS)
    private providerMap: Map<string, OAuthProviderStrategy>,
  ) {}

  async generateAuthUrl(providerCode: string): Promise<AuthUrlResponse> {
    const strategy = this.getStrategy(providerCode);

    const state = generateRandomToken();
    let codeVerifier: string | null = null;
    let codeChallenge: string | null = null;

    if (strategy.supportsPkce) {
      const pair = generatePkcePair();
      codeVerifier = pair.verifier;
      codeChallenge = pair.challenge;
    }

    const ctx: OAuthStateContext = { providerCode, codeVerifier };
    await this.redis.setCache(
      OAUTH_STATE_PREFIX + state,
      ctx,
      this.oauthConfig.stateTtlSeconds,
    );

    const url = strategy.getAuthorizationUrl(state, codeChallenge);
    return { url };
  }

  async handleCallback(
    providerCode: string,
    code: string,
    state: string,
    ip: string,
    userAgent: string,
  ): Promise<string> {
    const strategy = this.getStrategy(providerCode);

    // 原子消费 state，防重放
    const ctx = await this.redis.getAndDelete<OAuthStateContext>(
      OAUTH_STATE_PREFIX + state,
    );
    if (!ctx || ctx.providerCode !== providerCode) {
      throw new ApiException(ApiCode.OAuthStateInvalid, 'OAuth state 无效');
    }

    const normalized = await strategy.exchangeCodeForUser(
      code,
      ctx.codeVerifier,
    );

    const { userId, username } = await this.findOrCreateUser(
      normalized,
      providerCode,
    );

    const deviceName = parseDeviceName(userAgent);
    const session = await this.sessionService.create({
      userId: BigInt(userId),
      loginType: LOGIN_TYPE_OAUTH,
      ip,
      userAgent,
      deviceName,
    });

    const sessionIdStr = session.toString();
    const accessToken = this.tokenService.signAccess(userId, sessionIdStr);
    const refreshToken = await this.tokenService.signRefresh(
      userId,
      sessionIdStr,
      sessionIdStr,
    );

    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    this.eventEmitter.emit('auth.login', {
      userId: BigInt(userId),
      username,
      loginType: LOGIN_TYPE_OAUTH,
      provider: providerCode,
      ip,
      userAgent,
      status: 1,
    });

    const exchangeCode = generateRandomToken();
    const payload: OAuthExchangePayload = { accessToken, refreshToken };
    await this.redis.setCache(
      OAUTH_EXCHANGE_PREFIX + exchangeCode,
      payload,
      this.oauthConfig.exchangeTtlSeconds,
    );

    const redirectUrl = new URL(this.oauthConfig.frontendUrl);
    redirectUrl.hash = `/oauth/callback?code=${encodeURIComponent(exchangeCode)}&provider=${encodeURIComponent(providerCode)}`;
    return redirectUrl.toString();
  }

  async exchangeCode(exchangeCode: string): Promise<OAuthLoginResult> {
    const payload = await this.redis.getAndDelete<OAuthExchangePayload>(
      OAUTH_EXCHANGE_PREFIX + exchangeCode,
    );
    if (!payload) {
      throw new ApiException(
        ApiCode.OAuthExchangeCodeInvalid,
        '交换码无效或已过期',
      );
    }
    return payload;
  }

  private getStrategy(providerCode: string): OAuthProviderStrategy {
    const strategy = this.providerMap.get(providerCode);
    if (!strategy) {
      throw new ApiException(
        ApiCode.OAuthProviderNotFound,
        `不支持的登录方式: ${providerCode}`,
      );
    }
    return strategy;
  }

  /**
   * 查找或创建用户。邮箱匹配时自动关联已有账号。
   */
  private async findOrCreateUser(
    normalized: NormalizedOAuthUser,
    providerCode: string,
  ): Promise<{ userId: string; username: string }> {
    const provider = await this.prisma.authProvider.findUnique({
      where: { code: providerCode },
    });
    if (!provider || provider.status !== 1) {
      throw new ApiException(
        ApiCode.OAuthProviderDisabled,
        `登录方式 ${providerCode} 未启用`,
      );
    }

    // 1. 查找已绑定的 identity
    const existingIdentity = await this.prisma.userIdentity.findFirst({
      where: {
        providerId: provider.id,
        providerSubject: normalized.providerSubject,
        deletedId: 0n,
      },
      include: { user: true },
    });

    if (existingIdentity) {
      if (existingIdentity.user.status !== 1) {
        throw new ApiException(ApiCode.AccountDisabled, '账号已禁用');
      }
      await this.prisma.userIdentity.update({
        where: { id: existingIdentity.id },
        data: { lastLoginAt: new Date() },
      });
      return {
        userId: existingIdentity.user.id.toString(),
        username: existingIdentity.user.username,
      };
    }

    // 2. 邮箱匹配：自动关联已有用户
    if (normalized.providerEmail) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: normalized.providerEmail, deletedId: 0n },
      });
      if (existingUser) {
        if (existingUser.status !== 1) {
          throw new ApiException(ApiCode.AccountDisabled, '账号已禁用');
        }
        await this.prisma.userIdentity.create({
          data: {
            userId: existingUser.id,
            providerId: provider.id,
            providerSubject: normalized.providerSubject,
            providerUsername: normalized.providerUsername,
            providerEmail: normalized.providerEmail,
            providerAvatar: normalized.providerAvatar,
            rawProfile: normalized.rawProfile as Prisma.InputJsonValue,
          },
        });
        return {
          userId: existingUser.id.toString(),
          username: existingUser.username,
        };
      }
    }

    // 3. 首次登录，创建新用户
    const subjectSuffix = normalized.providerSubject.slice(-8);
    const username = `${providerCode}_${subjectSuffix}`;

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          nickname: normalized.providerUsername,
          email: normalized.providerEmail,
          status: 1,
        },
      });

      await tx.userIdentity.create({
        data: {
          userId: user.id,
          providerId: provider.id,
          providerSubject: normalized.providerSubject,
          providerUsername: normalized.providerUsername,
          providerEmail: normalized.providerEmail,
          providerAvatar: normalized.providerAvatar,
          rawProfile: normalized.rawProfile as Prisma.InputJsonValue,
        },
      });

      return user;
    });

    return { userId: newUser.id.toString(), username: newUser.username };
  }
}
