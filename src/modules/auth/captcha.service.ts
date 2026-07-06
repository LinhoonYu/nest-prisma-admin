import { Inject, Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import svgCaptcha from 'svg-captcha';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { ISecurityConfig, SecurityConfig } from '~/config';
import { RedisService } from '~/shared/redis/redis.service';
import { captchaKey } from '~/shared/redis/redis-keys';

const CAPTCHA_WIDTH = 160;
const CAPTCHA_HEIGHT = 50;
const FONT_SIZE = 56;

/** svg-captcha 内部加载的字体对象（类型定义未暴露） */
const captchaFont = (
  svgCaptcha as unknown as {
    options: {
      font: {
        unitsPerEm: number;
        ascender: number;
        descender: number;
        charToGlyph(ch: string): {
          advanceWidth?: number;
          getPath(
            left: number,
            top: number,
            fontSize: number,
          ): { toPathData(): string };
        };
      };
    };
  }
).options.font;

function randomInt(min: number, max: number): number {
  return Math.round(Math.random() * (max - min) + min);
}

/** 生成不出现负数结果的算术题（20 以内） */
function generateMathExpr(): { text: string; equation: string } {
  const isAddition = Math.random() > 0.5;
  if (isAddition) {
    const left = randomInt(1, 9);
    const right = randomInt(1, 9);
    return {
      text: (left + right).toString(),
      equation: `${left}+${right}`,
    };
  }
  // 减法：左边 ≥ 右边，结果 ≥ 0
  const left = randomInt(2, 20);
  const right = randomInt(1, left);
  return {
    text: (left - right).toString(),
    equation: `${left}-${right}`,
  };
}

/** 随机颜色（与 svg-captcha 一致的 HSL 算法） */
function randomColor(): string {
  const hue = randomInt(0, 24) / 24;
  const saturation = randomInt(60, 80) / 100;
  const lightness = randomInt(50, 75) / 100;
  const q =
    lightness < 0.5
      ? lightness * (lightness + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const hue2rgb = (pp: number, qq: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return pp + (qq - pp) * 6 * tt;
    if (tt < 1 / 2) return qq;
    if (tt < 2 / 3) return pp + (qq - pp) * (2 / 3 - tt) * 6;
    return pp;
  };
  const r = Math.floor(hue2rgb(p, q, hue + 1 / 3) * 255);
  const g = Math.floor(hue2rgb(p, q, hue) * 255);
  const b = Math.floor(hue2rgb(p, q, hue - 1 / 3) * 255);
  return `#${(b | (g << 8) | (r << 16) | (1 << 24)).toString(16).slice(1)}`;
}

/**
 * 使用 svg-captcha 默认字体渲染单个数字字符的 SVG path
 * 运算符（+/-）则不使用字体，直接绘制干净的 SVG 线条
 */
function renderDigitPath(char: string, x: number, y: number): string {
  const fontScale = FONT_SIZE / captchaFont.unitsPerEm;
  const glyph = captchaFont.charToGlyph(char);
  const glyphWidth = glyph.advanceWidth ? glyph.advanceWidth * fontScale : 0;
  const left = x - glyphWidth / 2;
  const capHeight = (captchaFont.ascender + captchaFont.descender) * fontScale;
  const top = y + capHeight / 2;
  const path = glyph.getPath(left, top, FONT_SIZE);
  return path.toPathData();
}

@Injectable()
export class CaptchaService {
  constructor(
    private redis: RedisService,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
  ) {}

  async generate(): Promise<{ key: string; svg: string }> {
    const expr = generateMathExpr();
    const equation = expr.equation;
    const spacing = (CAPTCHA_WIDTH - 2) / (equation.length + 1);
    const paths: string[] = [];

    for (let i = 0; i < equation.length; i++) {
      const char = equation[i];
      const x = spacing * (i + 1);
      const y = CAPTCHA_HEIGHT / 2;
      const color = randomColor();

      if (char === '+') {
        const arm = Math.round(FONT_SIZE * 0.1);
        paths.push(
          `<path d="M${x - arm},${y} L${x + arm},${y} M${x},${y - arm} L${x},${y + arm}" ` +
            `stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        );
      } else if (char === '-') {
        const arm = Math.round(FONT_SIZE * 0.12);
        paths.push(
          `<path d="M${x - arm},${y} L${x + arm},${y}" ` +
            `stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        );
      } else {
        const pathData = renderDigitPath(char, x, y);
        paths.push(`<path fill="${color}" d="${pathData}"/>`);
      }
    }

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CAPTCHA_WIDTH}" height="${CAPTCHA_HEIGHT}" viewBox="0,0,${CAPTCHA_WIDTH},${CAPTCHA_HEIGHT}">`,
      ...paths,
      '</svg>',
    ].join('');

    const key = nanoid();
    const ttl = this.securityConfig.captcha.expiresIn * 60;
    await this.redis.setCache(captchaKey(key), expr.text.toLowerCase(), ttl);
    return { key, svg };
  }

  async verify(key: string, code: string): Promise<void> {
    const stored = await this.redis.getAndDelete<string>(captchaKey(key));
    if (!stored || stored !== code.toLowerCase()) {
      throw new ApiException(ApiCode.CaptchaError, '验证码错误或已过期');
    }
  }
}
