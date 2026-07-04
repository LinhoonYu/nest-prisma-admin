import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AllConfigType } from '~/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PasswordService } from './password.service';
import { RsaService } from './rsa.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { UserContextService } from './user-context.service';

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
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    PasswordService,
    CaptchaService,
    RsaService,
    UserContextService,
    JwtStrategy,
    LocalStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [UserContextService, PasswordService, TokenService],
})
export class AuthModule {}
