import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { JwtPayload } from '~/common/decorators/current-user.decorator';
import { Public } from '~/common/decorators/public.decorator';

import { AuthService } from './auth.service';
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
  @ApiOperation({ summary: '登录' })
  async login(@Body() dto: LoginDto, @Req() request: FastifyRequest) {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';
    return this.authService.login(dto, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新令牌' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: '登出当前设备' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Headers('authorization') auth: string,
  ) {
    const accessToken = auth?.replace('Bearer ', '') || '';
    await this.authService.logout(user.userId, user.sessionId, accessToken);
  }

  @Post('logout-all')
  @ApiOperation({ summary: '登出所有设备' })
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
