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
  AssignDataScopeDto,
  AssignRolesDto,
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/user.dto';
import { userPermissions } from './user.permissions';
import { UserService } from './user.service';

@ApiTags('用户管理')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '用户列表' })
  @Perm(userPermissions.LIST)
  list(@Query() query: UserQueryDto, @CurrentUser('userId') userId: string) {
    return this.userService.list(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '用户详情' })
  @Perm(userPermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.userService.detail(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: '新增用户' })
  @Perm(userPermissions.CREATE)
  create(@Body() dto: CreateUserDto, @CurrentUser('userId') userId: string) {
    return this.userService.create(dto, BigInt(userId));
  }

  @Put(':id')
  @ApiOperation({ summary: '修改用户' })
  @Perm(userPermissions.UPDATE)
  update(
    @Param() { id }: IdParam,
    @Body() dto: UpdateUserDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.userService.update(BigInt(id), dto, BigInt(userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @Perm(userPermissions.DELETE)
  remove(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.userService.remove(BigInt(id), BigInt(userId));
  }

  @Put(':id/roles')
  @ApiOperation({ summary: '分配角色' })
  @Perm(userPermissions.ASSIGN_ROLES)
  assignRoles(
    @Param() { id }: IdParam,
    @Body() dto: AssignRolesDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.userService.assignRoles(BigInt(id), dto, BigInt(userId));
  }

  @Put(':id/data-scope')
  @ApiOperation({ summary: '设置数据范围' })
  @Perm(userPermissions.ASSIGN_SCOPE)
  assignDataScope(
    @Param() { id }: IdParam,
    @Body() dto: AssignDataScopeDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.userService.assignDataScope(BigInt(id), dto, BigInt(userId));
  }

  @Put(':id/password')
  @ApiOperation({ summary: '重置密码' })
  @Perm(userPermissions.RESET_PWD)
  resetPassword(@Param() { id }: IdParam, @Body() dto: ResetPasswordDto) {
    return this.userService.resetPassword(BigInt(id), dto);
  }
}
