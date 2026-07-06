import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AllConfigType, IOauthConfig, OauthConfig } from '~/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { DataScopeService } from './data-scope.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { OAUTH_PROVIDERS } from './oauth/oauth.constants';
import { OAuthController } from './oauth/oauth.controller';
import { OAuthService } from './oauth/oauth.service';
import type { OAuthProviderStrategy } from './oauth/providers/oauth-provider.interface';
import { GitHubProvider } from './oauth/providers/github.provider';
import { GiteeProvider } from './oauth/providers/gitee.provider';
import { GoogleProvider } from './oauth/providers/google.provider';
import { PasswordService } from './password.service';
import { RsaService } from './rsa.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { UserContextService } from './user-context.service';

function buildProviderMap(
  config: IOauthConfig,
): Map<string, OAuthProviderStrategy> {
  const map = new Map<string, OAuthProviderStrategy>();
  if (config.providers.google) {
    map.set('google', new GoogleProvider(config.providers.google));
  }
  if (config.providers.github) {
    map.set('github', new GitHubProvider(config.providers.github));
  }
  if (config.providers.gitee) {
    map.set('gitee', new GiteeProvider(config.providers.gitee));
  }
  return map;
}

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AllConfigType>) => {
        const security = config.get('security', { infer: true });
        if (!security) {
          throw new Error('Security config not found');
        }
        return {
          secret: security.jwt.secret,
          signOptions: {
            expiresIn: security.jwt.expiresIn,
            issuer: security.jwt.issuer,
            audience: security.jwt.audience,
          },
        } as JwtModuleOptions;
      },
    }),
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    PasswordService,
    CaptchaService,
    RsaService,
    UserContextService,
    DataScopeService,
    JwtStrategy,
    LocalStrategy,
    OAuthService,
    {
      provide: OAUTH_PROVIDERS,
      inject: [OauthConfig.KEY],
      useFactory: (config: IOauthConfig): Map<string, OAuthProviderStrategy> =>
        buildProviderMap(config),
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [
    UserContextService,
    PasswordService,
    TokenService,
    SessionService,
    DataScopeService,
  ],
})
export class AuthModule {}
