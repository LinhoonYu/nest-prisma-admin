import { Inject, Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import svgCaptcha from 'svg-captcha';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { ISecurityConfig, SecurityConfig } from '~/config';
import { RedisService } from '~/shared/redis/redis.service';

const CAPTCHA_PREFIX = 'captcha:';

@Injectable()
export class CaptchaService {
  constructor(
    private redis: RedisService,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
  ) {}

  async generate(): Promise<{ key: string; svg: string }> {
    const captcha = svgCaptcha.createMathExpr({
      mathMin: 1,
      mathMax: 20,
      mathOperator: '+/-',
      noise: 2,
      color: true,
    });
    const key = nanoid();
    const ttl = this.securityConfig.captcha.expiresIn * 60;
    await this.redis.setCache(
      CAPTCHA_PREFIX + key,
      captcha.text.toLowerCase(),
      ttl,
    );
    return { key, svg: captcha.data };
  }

  async verify(key: string, code: string): Promise<void> {
    const stored = await this.redis.getAndDelete<string>(CAPTCHA_PREFIX + key);
    if (!stored || stored !== code.toLowerCase()) {
      throw new ApiException(ApiCode.CaptchaError, '验证码错误或已过期');
    }
  }
}
