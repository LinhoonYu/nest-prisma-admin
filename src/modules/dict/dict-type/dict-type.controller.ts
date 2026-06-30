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
  CreateDictTypeDto,
  DictTypeQueryDto,
  UpdateDictTypeDto,
} from './dto/dict-type.dto';
import { dictTypePermissions } from './dict-type.permissions';
import { DictTypeService } from './dict-type.service';

@ApiTags('字典类型')
@Controller('dict-types')
export class DictTypeController {
  constructor(private dictTypeService: DictTypeService) {}

  @Get()
  @ApiOperation({ summary: '字典类型列表' })
  @Perm(dictTypePermissions.LIST)
  list(@Query() query: DictTypeQueryDto) {
    return this.dictTypeService.list(query);
  }

  @Get(':code/items')
  @ApiOperation({ summary: '按编码查询字典项' })
  @Perm(dictTypePermissions.READ)
  itemsByCode(@Param('code') code: string) {
    return this.dictTypeService.itemsByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: '字典类型详情' })
  @Perm(dictTypePermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.dictTypeService.detail(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: '新增字典类型' })
  @Perm(dictTypePermissions.CREATE)
  create(
    @Body() dto: CreateDictTypeDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dictTypeService.create(dto, BigInt(userId));
  }

  @Put(':id')
  @ApiOperation({ summary: '修改字典类型' })
  @Perm(dictTypePermissions.UPDATE)
  update(
    @Param() { id }: IdParam,
    @Body() dto: UpdateDictTypeDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dictTypeService.update(BigInt(id), dto, BigInt(userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除字典类型' })
  @Perm(dictTypePermissions.DELETE)
  remove(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.dictTypeService.remove(BigInt(id), BigInt(userId));
  }
}
