import { Inject } from '@nestjs/common';
import {
  Body,
  Controller,
  Delete,
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

import {
  CurrentUser,
  type JwtPayload,
} from '~/common/decorators/current-user.decorator';
import { Public } from '~/common/decorators/public.decorator';
import { IOauthConfig, OauthConfig } from '~/config';
import {
  LogAction,
  SkipOperationLog,
} from '~/modules/log/operation-log/log-action.decorator';

import { SUPPORTED_PROVIDERS, type SupportedProvider } from './oauth.constants';
import { OAuthService } from './oauth.service';
import { BindIdentityDto } from './dto/bind-identity.dto';
import { LinkExistingDto } from './dto/link-existing.dto';
import { OAuthRegisterDto } from './dto/oauth-register.dto';

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
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private oauthService: OAuthService,
    @Inject(OauthConfig.KEY) private oauthConfig: IOauthConfig,
  ) {}

  @Public()
  @Get(':provider/auth-url')
  @ApiOperation({ summary: '获取 OAuth 授权 URL' })
  @SkipOperationLog()
  async authUrl(
    @Param() param: OAuthProviderParamDto,
    @Query('mode') mode?: string,
  ) {
    if (!isSupportedProvider(param.provider)) {
      return { url: '' };
    }
    const m = mode === 'bind' ? 'bind' : 'login';
    return this.oauthService.generateAuthUrl(param.provider, m);
  }

  @Public()
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

  @Public()
  @Post('exchange')
  @ApiOperation({ summary: '用一次性交换码换取 JWT' })
  @SkipOperationLog()
  async exchange(@Body() dto: OAuthExchangeDto) {
    return this.oauthService.exchangeCode(dto.code);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: '首次 OAuth 登录：创建新账号' })
  @SkipOperationLog()
  async register(
    @Body() dto: OAuthRegisterDto,
    @Req() request: FastifyRequest,
  ) {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';
    return this.oauthService.registerNewAccount(dto.pendingCode, ip, userAgent);
  }

  @Public()
  @Post('link-existing')
  @ApiOperation({ summary: '首次 OAuth 登录：关联已有账号' })
  @SkipOperationLog()
  async linkExisting(
    @Body() dto: LinkExistingDto,
    @Req() request: FastifyRequest,
  ) {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';
    return this.oauthService.linkExistingAccount(
      dto.pendingCode,
      dto.username,
      dto.password,
      ip,
      userAgent,
    );
  }

  @Post('bind')
  @ApiOperation({ summary: '绑定第三方账号' })
  @LogAction({ module: '认证', action: '绑定第三方账号' })
  async bind(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BindIdentityDto,
  ): Promise<void> {
    await this.oauthService.bindIdentity(
      user.userId,
      dto.provider,
      dto.code,
      dto.state,
    );
  }

  @Delete('identities/:identityId')
  @ApiOperation({ summary: '解绑第三方账号' })
  @LogAction({ module: '认证', action: '解绑第三方账号' })
  async unbind(
    @CurrentUser() user: JwtPayload,
    @Param('identityId') identityId: string,
  ): Promise<void> {
    await this.oauthService.unbindIdentity(user.userId, identityId);
  }

  @Get('identities')
  @ApiOperation({ summary: '查询已绑定的第三方账号' })
  @SkipOperationLog()
  async listIdentities(@CurrentUser() user: JwtPayload) {
    return this.oauthService.listIdentities(user.userId);
  }

  private buildErrorUrl(message: string): string {
    const url = new URL(this.oauthConfig.frontendUrl);
    url.hash = `/oauth/callback?error=${encodeURIComponent(message)}`;
    return url.toString();
  }
}
