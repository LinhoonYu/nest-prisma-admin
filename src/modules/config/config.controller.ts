import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IdParam } from '~/common/dto/id-param.dto';
import { Perm } from '~/common/decorators/perm.decorator';

import {
  ConfigQueryDto,
  CreateConfigDto,
  UpdateConfigDto,
} from './dto/config.dto';
import { configPermissions } from './config.permissions';
import { ConfigService } from './config.service';

@ApiTags('系统配置')
@Controller('configs')
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: '配置列表' })
  @Perm(configPermissions.LIST)
  list(@Query() query: ConfigQueryDto) {
    return this.configService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '配置详情' })
  @Perm(configPermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.configService.detail(BigInt(id));
  }

  @Get(':id/form')
  @ApiOperation({ summary: '配置表单数据' })
  @Perm(configPermissions.READ)
  getFormData(@Param() { id }: IdParam) {
    return this.configService.getFormData(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: '新增配置' })
  @Perm(configPermissions.CREATE)
  create(@Body() dto: CreateConfigDto, @CurrentUser('userId') userId: string) {
    return this.configService.create(dto, BigInt(userId));
  }

  @Put('refresh')
  @ApiOperation({ summary: '刷新配置缓存' })
  @Perm(configPermissions.REFRESH)
  refreshCache() {
    return this.configService.refreshCache();
  }

  @Put(':id')
  @ApiOperation({ summary: '修改配置' })
  @Perm(configPermissions.UPDATE)
  update(
    @Param() { id }: IdParam,
    @Body() dto: UpdateConfigDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.configService.update(BigInt(id), dto, BigInt(userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除配置' })
  @Perm(configPermissions.DELETE)
  remove(@Param() { id }: IdParam) {
    return this.configService.remove(BigInt(id));
  }
}
