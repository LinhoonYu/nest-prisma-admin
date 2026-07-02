import { Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IdParam } from '~/common/dto/id-param.dto';

import { MyNoticeQueryDto } from './dto/my-notice.dto';
import { MyNoticeService } from './my-notice.service';

@ApiTags('我的通知')
@Controller('my-notices')
export class MyNoticeController {
  constructor(private myNoticeService: MyNoticeService) {}

  @Get()
  @ApiOperation({ summary: '我的通知列表' })
  list(
    @Query() query: MyNoticeQueryDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.myNoticeService.list(BigInt(userId), query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '未读通知数量' })
  unreadCount(@CurrentUser('userId') userId: string) {
    return this.myNoticeService.unreadCount(BigInt(userId));
  }

  @Get(':id')
  @ApiOperation({ summary: '通知详情（同时标记已读）' })
  detail(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.myNoticeService.detail(BigInt(userId), BigInt(id));
  }

  @Put('read-all')
  @ApiOperation({ summary: '全部已读' })
  readAll(@CurrentUser('userId') userId: string) {
    return this.myNoticeService.readAll(BigInt(userId));
  }
}
