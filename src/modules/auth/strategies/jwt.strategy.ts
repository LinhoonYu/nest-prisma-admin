import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '~/common/decorators/current-user.decorator';
import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { ISecurityConfig, SecurityConfig } from '~/config';
import { SessionService } from '../session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(SecurityConfig.KEY) securityConfig: ISecurityConfig,
    private sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: securityConfig.jwt.secret,
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const active = await this.sessionService.isActive(
      BigInt(payload.sessionId),
    );
    if (!active) {
      throw new ApiException(ApiCode.SessionExpired, '会话已失效，请重新登录');
    }
    return { userId: payload.userId, sessionId: payload.sessionId };
  }
}
