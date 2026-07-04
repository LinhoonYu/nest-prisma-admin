import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { JwtPayload } from '~/common/decorators/current-user.decorator';
import { Public } from '~/common/decorators/public.decorator';

import {
  LogAction,
  SkipOperationLog,
} from '~/modules/log/operation-log/log-action.decorator';

import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { LocalUser } from './strategies/local.strategy';
import { LoginDto } from './dto/login.dto';
import { PublicKeyVo } from './dto/public-key.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Get('captcha')
  @ApiOperation({ summary: '获取验证码' })
  captcha() {
    return this.authService.captcha();
  }

  @Public()
  @Get('public-key')
  @ApiOperation({ summary: '获取 RSA 公钥' })
  @ApiOkResponse({ type: PublicKeyVo })
  async publicKey(): Promise<PublicKeyVo> {
    return this.authService.generatePublicKey();
  }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: '登录' })
  @SkipOperationLog()
  async login(
    @Req() request: FastifyRequest,
    // DTO 仅触发 ValidationPipe 校验，认证逻辑在 LocalAuthGuard/LocalStrategy 中
    @Body() _dto: LoginDto,
  ) {
    const user = request.user as unknown as LocalUser;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';
    return this.authService.login(user, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新令牌' })
  @SkipOperationLog()
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: '登出当前设备' })
  @LogAction({ module: '认证', action: '登出', description: '登出当前设备' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Headers('authorization') auth: string,
  ) {
    const accessToken = auth?.replace('Bearer ', '') || '';
    await this.authService.logout(user.userId, user.sessionId, accessToken);
  }

  @Post('logout-all')
  @ApiOperation({ summary: '登出所有设备' })
  @LogAction({ module: '认证', action: '登出', description: '登出所有设备' })
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Headers('authorization') auth: string,
  ) {
    const accessToken = auth?.replace('Bearer ', '') || '';
    await this.authService.logoutAll(user.userId, accessToken);
  }

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  profile(@CurrentUser() user: JwtPayload) {
    return this.authService.profile(user.userId);
  }
}
