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
  AssignMenusDto,
  AssignPermissionsDto,
  CreateRoleDto,
  RoleQueryDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { rolePermissions } from './role.permissions';
import { RoleService } from './role.service';

@ApiTags('角色管理')
@Controller('roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: '角色列表' })
  @Perm(rolePermissions.LIST)
  list(@Query() query: RoleQueryDto) {
    return this.roleService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '角色详情' })
  @Perm(rolePermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.roleService.detail(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: '新增角色' })
  @Perm(rolePermissions.CREATE)
  create(@Body() dto: CreateRoleDto, @CurrentUser('userId') userId: string) {
    return this.roleService.create(dto, BigInt(userId));
  }

  @Put(':id')
  @ApiOperation({ summary: '修改角色' })
  @Perm(rolePermissions.UPDATE)
  update(
    @Param() { id }: IdParam,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roleService.update(BigInt(id), dto, BigInt(userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  @Perm(rolePermissions.DELETE)
  remove(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.roleService.remove(BigInt(id), BigInt(userId));
  }

  @Put(':id/menus')
  @ApiOperation({ summary: '分配菜单' })
  @Perm(rolePermissions.ASSIGN_MENUS)
  assignMenus(
    @Param() { id }: IdParam,
    @Body() dto: AssignMenusDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roleService.assignMenus(BigInt(id), dto, BigInt(userId));
  }

  @Put(':id/permissions')
  @ApiOperation({ summary: '分配权限' })
  @Perm(rolePermissions.ASSIGN_PERMS)
  assignPermissions(
    @Param() { id }: IdParam,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roleService.assignPermissions(BigInt(id), dto, BigInt(userId));
  }
}
