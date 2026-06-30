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
  CreateDictItemDto,
  DictItemQueryDto,
  UpdateDictItemDto,
} from './dto/dict-item.dto';
import { dictItemPermissions } from './dict-item.permissions';
import { DictItemService } from './dict-item.service';

@ApiTags('字典项')
@Controller('dict-items')
export class DictItemController {
  constructor(private dictItemService: DictItemService) {}

  @Get()
  @ApiOperation({ summary: '字典项列表' })
  @Perm(dictItemPermissions.LIST)
  list(@Query() query: DictItemQueryDto) {
    return this.dictItemService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '字典项详情' })
  @Perm(dictItemPermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.dictItemService.detail(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: '新增字典项' })
  @Perm(dictItemPermissions.CREATE)
  create(
    @Body() dto: CreateDictItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dictItemService.create(dto, BigInt(userId));
  }

  @Put(':id')
  @ApiOperation({ summary: '修改字典项' })
  @Perm(dictItemPermissions.UPDATE)
  update(
    @Param() { id }: IdParam,
    @Body() dto: UpdateDictItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dictItemService.update(BigInt(id), dto, BigInt(userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除字典项' })
  @Perm(dictItemPermissions.DELETE)
  remove(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.dictItemService.remove(BigInt(id), BigInt(userId));
  }
}
