import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IdParam } from '~/common/dto/id-param.dto';
import { Perm } from '~/common/decorators/perm.decorator';

import { CleanLoginLogDto, LoginLogQueryDto } from './dto/login-log.dto';
import { loginLogPermissions } from './login-log.permissions';
import { LoginLogService } from './login-log.service';

@ApiTags('登录日志')
@Controller('login-logs')
export class LoginLogController {
  constructor(private loginLogService: LoginLogService) {}

  @Get()
  @ApiOperation({ summary: '登录日志列表' })
  @Perm(loginLogPermissions.LIST)
  list(
    @Query() query: LoginLogQueryDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.loginLogService.list(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '登录日志详情' })
  @Perm(loginLogPermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.loginLogService.detail(BigInt(id));
  }

  @Post('clean')
  @ApiOperation({ summary: '清理过期登录日志' })
  @Perm(loginLogPermissions.DELETE)
  clean(@Body() dto: CleanLoginLogDto) {
    return this.loginLogService.clean(dto);
  }
}
