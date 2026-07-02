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
  CreateNoticeDto,
  NoticeQueryDto,
  UpdateNoticeDto,
} from './dto/notice.dto';
import { noticePermissions } from './notice.permissions';
import { NoticeService } from './notice.service';

@ApiTags('通知管理')
@Controller('notices')
export class NoticeController {
  constructor(private noticeService: NoticeService) {}

  @Get()
  @ApiOperation({ summary: '通知列表' })
  @Perm(noticePermissions.LIST)
  list(@Query() query: NoticeQueryDto) {
    return this.noticeService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '通知详情' })
  @Perm(noticePermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.noticeService.detail(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: '新增通知' })
  @Perm(noticePermissions.CREATE)
  create(@Body() dto: CreateNoticeDto, @CurrentUser('userId') userId: string) {
    return this.noticeService.create(dto, BigInt(userId));
  }

  @Put(':id')
  @ApiOperation({ summary: '修改通知' })
  @Perm(noticePermissions.UPDATE)
  update(
    @Param() { id }: IdParam,
    @Body() dto: UpdateNoticeDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.noticeService.update(BigInt(id), dto, BigInt(userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知（支持逗号分隔批量删除）' })
  @Perm(noticePermissions.DELETE)
  remove(@Param() { id }: IdParam) {
    const idList = id.split(',').map((s) => BigInt(s.trim()));
    return idList.length === 1
      ? this.noticeService.remove(idList[0])
      : this.noticeService.removeBatch(idList);
  }

  @Put(':id/publish')
  @ApiOperation({ summary: '发布通知' })
  @Perm(noticePermissions.PUBLISH)
  publish(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.noticeService.publish(BigInt(id), BigInt(userId));
  }

  @Put(':id/revoke')
  @ApiOperation({ summary: '撤回通知' })
  @Perm(noticePermissions.REVOKE)
  revoke(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.noticeService.revoke(BigInt(id), BigInt(userId));
  }
}
