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
  CreatePermissionDto,
  PermissionQueryDto,
  UpdatePermissionDto,
} from './dto/permission.dto';
import { permissionPermissions } from './permission.permissions';
import { PermissionService } from './permission.service';

@ApiTags('权限管理')
@Controller('permissions')
export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: '权限列表' })
  @Perm(permissionPermissions.LIST)
  list(@Query() query: PermissionQueryDto) {
    return this.permissionService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '权限详情' })
  @Perm(permissionPermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.permissionService.detail(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: '新增权限' })
  @Perm(permissionPermissions.CREATE)
  create(
    @Body() dto: CreatePermissionDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.permissionService.create(dto, BigInt(userId));
  }

  @Put(':id')
  @ApiOperation({ summary: '修改权限' })
  @Perm(permissionPermissions.UPDATE)
  update(
    @Param() { id }: IdParam,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.permissionService.update(BigInt(id), dto, BigInt(userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除权限' })
  @Perm(permissionPermissions.DELETE)
  remove(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.permissionService.remove(BigInt(id), BigInt(userId));
  }
}
