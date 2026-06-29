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

import { CreateDeptDto, DeptQueryDto, UpdateDeptDto } from './dto/dept.dto';
import { deptPermissions } from './dept.permissions';
import { DeptService } from './dept.service';

@ApiTags('部门管理')
@Controller('depts')
export class DeptController {
  constructor(private deptService: DeptService) {}

  @Get()
  @ApiOperation({ summary: '部门树' })
  @Perm(deptPermissions.LIST)
  tree(@Query() query?: DeptQueryDto) {
    return this.deptService.tree(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '部门详情' })
  @Perm(deptPermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.deptService.detail(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: '新增部门' })
  @Perm(deptPermissions.CREATE)
  create(@Body() dto: CreateDeptDto, @CurrentUser('userId') userId: string) {
    return this.deptService.create(dto, BigInt(userId));
  }

  @Put(':id')
  @ApiOperation({ summary: '修改部门' })
  @Perm(deptPermissions.UPDATE)
  update(
    @Param() { id }: IdParam,
    @Body() dto: UpdateDeptDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.deptService.update(BigInt(id), dto, BigInt(userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除部门' })
  @Perm(deptPermissions.DELETE)
  remove(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.deptService.remove(BigInt(id), BigInt(userId));
  }
}
