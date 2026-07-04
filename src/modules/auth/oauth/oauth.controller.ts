import { Inject } from '@nestjs/common';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { IsString, MinLength } from 'class-validator';

import { Public } from '~/common/decorators/public.decorator';
import { IOauthConfig, OauthConfig } from '~/config';
import { SkipOperationLog } from '~/modules/log/operation-log/log-action.decorator';

import { SUPPORTED_PROVIDERS, type SupportedProvider } from './oauth.constants';
import { OAuthService } from './oauth.service';

class OAuthProviderParamDto {
  @IsString()
  @MinLength(1)
  provider: string;
}

class OAuthExchangeDto {
  @IsString()
  @MinLength(1)
  code: string;
}

function isSupportedProvider(value: string): value is SupportedProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(value);
}

@ApiTags('OAuth 认证')
@Public()
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private oauthService: OAuthService,
    @Inject(OauthConfig.KEY) private oauthConfig: IOauthConfig,
  ) {}

  @Get(':provider/auth-url')
  @ApiOperation({ summary: '获取 OAuth 授权 URL' })
  @SkipOperationLog()
  async authUrl(@Param() param: OAuthProviderParamDto) {
    if (!isSupportedProvider(param.provider)) {
      return { url: '' };
    }
    return this.oauthService.generateAuthUrl(param.provider);
  }

  @Get(':provider/callback')
  @ApiOperation({ summary: 'OAuth 回调' })
  @SkipOperationLog()
  async callback(
    @Param() param: OAuthProviderParamDto,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    if (!isSupportedProvider(param.provider) || !code || !state) {
      reply.code(302).redirect(this.buildErrorUrl('参数无效'));
      return;
    }

    try {
      const ip = request.ip;
      const userAgent = request.headers['user-agent'] || '';
      const redirectUrl = await this.oauthService.handleCallback(
        param.provider,
        code,
        state,
        ip,
        userAgent,
      );
      reply.code(302).redirect(redirectUrl);
    } catch (e) {
      console.error('[OAuth] callback failed:', e);
      const message = e instanceof Error ? e.message : '登录失败，请重试';
      reply.code(302).redirect(this.buildErrorUrl(message));
    }
  }

  @Post('exchange')
  @ApiOperation({ summary: '用一次性交换码换取 JWT' })
  @SkipOperationLog()
  async exchange(@Body() dto: OAuthExchangeDto) {
    return this.oauthService.exchangeCode(dto.code);
  }

  private buildErrorUrl(message: string): string {
    const url = new URL(this.oauthConfig.frontendUrl);
    url.hash = `/oauth/callback?error=${encodeURIComponent(message)}`;
    return url.toString();
  }
}
