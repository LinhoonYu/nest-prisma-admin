import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomBytes } from 'crypto';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import {
  IAppConfig,
  IOauthConfig,
  ISecurityConfig,
  AppConfig,
  OauthConfig,
  SecurityConfig,
} from '~/config';
import { Prisma } from '~/generated/prisma/client';
import { PrismaService } from '~/shared/prisma/prisma.service';
import { RedisService } from '~/shared/redis/redis.service';
import {
  oauthExchangeKey,
  oauthPendingKey,
  oauthStateKey,
} from '~/shared/redis/redis-keys';

import { LOGIN_TYPE_OAUTH } from '../auth.constants';
import { PasswordService } from '../password.service';
import { RsaService } from '../rsa.service';
import { SessionService } from '../session.service';
import { TokenService } from '../token.service';
import { OAUTH_PROVIDERS } from './oauth.constants';
import type {
  AuthUrlResponse,
  OAuthExchangePayload,
  OAuthLoginResult,
  OAuthPendingPayload,
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

@Injectable()
export class OAuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private sessionService: SessionService,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private rsaService: RsaService,
    private eventEmitter: EventEmitter2,
    @Inject(OauthConfig.KEY) private oauthConfig: IOauthConfig,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
    @Inject(OAUTH_PROVIDERS)
    private providerMap: Map<string, OAuthProviderStrategy>,
    @Inject(AppConfig.KEY) private appConfig: IAppConfig,
  ) {}

  async generateAuthUrl(
    providerCode: string,
    mode: 'login' | 'bind' = 'login',
  ): Promise<AuthUrlResponse> {
    const strategy = this.getStrategy(providerCode);

    const state = generateRandomToken();
    let codeVerifier: string | null = null;
    let codeChallenge: string | null = null;

    if (strategy.supportsPkce) {
      const pair = generatePkcePair();
      codeVerifier = pair.verifier;
      codeChallenge = pair.challenge;
    }

    const ctx: OAuthStateContext = { providerCode, codeVerifier, mode };
    await this.redis.setCache(
      oauthStateKey(state),
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

    const ctx = await this.redis.getCache<OAuthStateContext>(
      oauthStateKey(state),
    );
    if (!ctx || ctx.providerCode !== providerCode) {
      throw new ApiException(ApiCode.OAuthStateInvalid);
    }

    // 绑定模式：不消费 state，透传 code/state 给前端
    if (ctx.mode === 'bind') {
      const redirectUrl = new URL(this.oauthConfig.frontendUrl);
      redirectUrl.hash = `/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&provider=${encodeURIComponent(providerCode)}&mode=bind`;
      return redirectUrl.toString();
    }

    // 登录模式：消费 state
    await this.redis.del(oauthStateKey(state));

    const normalized = await strategy.exchangeCodeForUser(
      code,
      ctx.codeVerifier,
    );

    const existingIdentity = await this.findExistingIdentity(
      providerCode,
      normalized.providerSubject,
    );

    // 已绑定：直接登录
    if (existingIdentity) {
      if (existingIdentity.user.status !== 1) {
        throw new ApiException(ApiCode.AccountDisabled);
      }
      await this.prisma.userIdentity.update({
        where: { id: existingIdentity.id },
        data: { lastLoginAt: new Date() },
      });

      const { accessToken, refreshToken } = await this.issueTokens(
        existingIdentity.user.id.toString(),
        existingIdentity.user.username,
        providerCode,
        ip,
        userAgent,
      );

      const exchangeCode = generateRandomToken();
      await this.redis.setCache(
        oauthExchangeKey(exchangeCode),
        { accessToken, refreshToken } satisfies OAuthExchangePayload,
        this.oauthConfig.exchangeTtlSeconds,
      );

      const redirectUrl = new URL(this.oauthConfig.frontendUrl);
      redirectUrl.hash = `/oauth/callback?code=${encodeURIComponent(exchangeCode)}&provider=${encodeURIComponent(providerCode)}`;
      return redirectUrl.toString();
    }

    // 首次登录：不创建账号，存 pending 让用户选择
    const pendingCode = generateRandomToken();
    await this.redis.setCache(
      oauthPendingKey(pendingCode),
      { providerCode, normalized } satisfies OAuthPendingPayload,
      this.oauthConfig.stateTtlSeconds,
    );

    const redirectUrl = new URL(this.oauthConfig.frontendUrl);
    redirectUrl.hash = `/oauth/callback?pending=${encodeURIComponent(pendingCode)}&provider=${encodeURIComponent(providerCode)}`;
    return redirectUrl.toString();
  }

  async exchangeCode(exchangeCode: string): Promise<OAuthLoginResult> {
    const payload = await this.redis.getAndDelete<OAuthExchangePayload>(
      oauthExchangeKey(exchangeCode),
    );
    if (!payload) {
      throw new ApiException(ApiCode.OAuthExchangeCodeInvalid);
    }
    return payload;
  }

  /**
   * 首次 OAuth 登录：创建新账号并绑定 identity。
   */
  async registerNewAccount(
    pendingCode: string,
    ip: string,
    userAgent: string,
  ): Promise<OAuthLoginResult> {
    const payload = await this.consumePending(pendingCode);
    const { providerCode, normalized } = payload;

    const subjectSuffix = normalized.providerSubject.slice(-8);
    const username = `${providerCode}_${subjectSuffix}`;

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          nickname: normalized.providerUsername,
          status: 1,
        },
      });

      await tx.userIdentity.create({
        data: {
          userId: user.id,
          providerCode,
          providerSubject: normalized.providerSubject,
          providerUsername: normalized.providerUsername,
          providerEmail: normalized.providerEmail,
          providerAvatar: normalized.providerAvatar,
          ...(normalized.providerMetadata
            ? {
                providerMetadata:
                  normalized.providerMetadata as Prisma.InputJsonValue,
              }
            : {}),
        },
      });

      return user;
    });

    return this.issueTokens(
      newUser.id.toString(),
      newUser.username,
      providerCode,
      ip,
      userAgent,
    );
  }

  /**
   * 首次 OAuth 登录：验证已有账号密码，绑定 identity 到该账号。
   */
  async linkExistingAccount(
    pendingCode: string,
    username: string,
    password: string,
    ip: string,
    userAgent: string,
  ): Promise<OAuthLoginResult> {
    const payload = await this.consumePending(pendingCode);
    const { providerCode, normalized } = payload;

    const user = await this.prisma.user.findFirst({
      where: { username },
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

    let plainPassword = password;
    if (this.securityConfig.rsa.enabled) {
      plainPassword = await this.rsaService.decrypt(password);
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

    // 检查目标用户是否已绑定该提供商
    const selfIdentity = await this.prisma.userIdentity.findFirst({
      where: { userId: user.id, providerCode },
      select: { id: true },
    });
    if (selfIdentity) {
      throw new ApiException(ApiCode.OAuthProviderAlreadyLinked);
    }

    try {
      await this.prisma.userIdentity.create({
        data: {
          userId: user.id,
          providerCode,
          providerSubject: normalized.providerSubject,
          providerUsername: normalized.providerUsername,
          providerEmail: normalized.providerEmail,
          providerAvatar: normalized.providerAvatar,
          ...(normalized.providerMetadata
            ? {
                providerMetadata:
                  normalized.providerMetadata as Prisma.InputJsonValue,
              }
            : {}),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ApiException(ApiCode.OAuthIdentityAlreadyBound);
      }
      throw e;
    }

    return this.issueTokens(
      user.id.toString(),
      user.username,
      providerCode,
      ip,
      userAgent,
    );
  }

  /**
   * 已登录用户手动绑定第三方账号。
   */
  async bindIdentity(
    userId: string,
    providerCode: string,
    code: string,
    state?: string,
  ): Promise<void> {
    const strategy = this.getStrategy(providerCode);

    let codeVerifier: string | null = null;
    if (strategy.supportsPkce) {
      if (!state) {
        throw new ApiException(ApiCode.OAuthStateInvalid);
      }
      const ctx = await this.redis.getAndDelete<OAuthStateContext>(
        oauthStateKey(state),
      );
      if (!ctx || ctx.providerCode !== providerCode) {
        throw new ApiException(ApiCode.OAuthStateInvalid);
      }
      codeVerifier = ctx.codeVerifier;
    }

    const normalized = await strategy.exchangeCodeForUser(code, codeVerifier);

    const existingIdentity = await this.prisma.userIdentity.findFirst({
      where: {
        providerCode,
        providerSubject: normalized.providerSubject,
      },
      select: { userId: true },
    });

    if (existingIdentity) {
      if (existingIdentity.userId.toString() === userId) {
        throw new ApiException(ApiCode.OAuthProviderAlreadyLinked);
      }
      throw new ApiException(ApiCode.OAuthIdentityAlreadyBound);
    }

    const selfIdentity = await this.prisma.userIdentity.findFirst({
      where: { userId: BigInt(userId), providerCode },
      select: { id: true },
    });
    if (selfIdentity) {
      throw new ApiException(ApiCode.OAuthProviderAlreadyLinked);
    }

    try {
      await this.prisma.userIdentity.create({
        data: {
          userId: BigInt(userId),
          providerCode,
          providerSubject: normalized.providerSubject,
          providerUsername: normalized.providerUsername,
          providerEmail: normalized.providerEmail,
          providerAvatar: normalized.providerAvatar,
          ...(normalized.providerMetadata
            ? {
                providerMetadata:
                  normalized.providerMetadata as Prisma.InputJsonValue,
              }
            : {}),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ApiException(ApiCode.OAuthIdentityAlreadyBound);
      }
      throw e;
    }
  }

  async unbindIdentity(userId: string, identityId: string): Promise<void> {
    const identity = await this.prisma.userIdentity.findFirst({
      where: { id: BigInt(identityId) },
    });

    if (!identity) {
      throw new ApiException(ApiCode.NotFound);
    }

    if (identity.userId.toString() !== userId) {
      throw new ApiException(ApiCode.NoPermission);
    }

    const [otherIdentities, credential] = await Promise.all([
      this.prisma.userIdentity.count({
        where: {
          userId: BigInt(userId),
          NOT: { id: BigInt(identityId) },
        },
      }),
      this.prisma.userCredential.findUnique({
        where: { userId: BigInt(userId) },
        select: { id: true },
      }),
    ]);

    if (otherIdentities === 0 && !credential) {
      throw new ApiException(ApiCode.OAuthCannotUnbindLastIdentity);
    }

    await this.prisma.userIdentity.update({
      where: { id: BigInt(identityId) },
      data: {
        deletedAt: new Date(),
        deletedId: BigInt(identityId),
      },
    });
  }

  async listIdentities(userId: string): Promise<
    {
      id: bigint;
      providerCode: string;
      providerUsername: string | null;
      providerAvatar: string | null;
      linkedAt: Date;
      lastLoginAt: Date | null;
    }[]
  > {
    return this.prisma.userIdentity.findMany({
      where: { userId: BigInt(userId) },
      select: {
        id: true,
        providerCode: true,
        providerUsername: true,
        providerAvatar: true,
        linkedAt: true,
        lastLoginAt: true,
      },
      orderBy: { linkedAt: 'asc' },
    });
  }

  private async findExistingIdentity(
    providerCode: string,
    providerSubject: string,
  ) {
    return this.prisma.userIdentity.findFirst({
      where: { providerCode, providerSubject },
      include: { user: true },
    });
  }

  private async consumePending(
    pendingCode: string,
  ): Promise<OAuthPendingPayload> {
    const payload = await this.redis.getAndDelete<OAuthPendingPayload>(
      oauthPendingKey(pendingCode),
    );
    if (!payload) {
      throw new ApiException(ApiCode.OAuthPendingInvalid);
    }
    return payload;
  }

  private async issueTokens(
    userId: string,
    username: string,
    provider: string,
    ip: string,
    userAgent: string,
  ): Promise<OAuthLoginResult> {
    if (!this.appConfig.multiDeviceLogin) {
      await this.sessionService.revokeByUser(userId);
    }

    const sessionId = await this.sessionService.create(userId);
    const accessToken = this.tokenService.signAccess(userId, sessionId);
    const refreshToken = await this.tokenService.signRefresh(userId, sessionId);

    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    this.eventEmitter.emit('auth.login', {
      userId: BigInt(userId),
      username,
      loginType: LOGIN_TYPE_OAUTH,
      provider,
      ip,
      userAgent,
      status: 1,
    });

    return { accessToken, refreshToken };
  }

  private getStrategy(providerCode: string): OAuthProviderStrategy {
    const strategy = this.providerMap.get(providerCode);
    if (!strategy) {
      throw new ApiException(ApiCode.OAuthProviderNotFound, {
        provider: providerCode,
      });
    }
    return strategy;
  }
}
