import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IdParam } from '~/common/dto/id-param.dto';
import { Perm } from '~/common/decorators/perm.decorator';

import {
  CleanOperationLogDto,
  OperationLogQueryDto,
} from './dto/operation-log.dto';
import { operationLogPermissions } from './operation-log.permissions';
import { OperationLogService } from './operation-log.service';

@ApiTags('操作日志')
@Controller('operation-logs')
export class OperationLogController {
  constructor(private operationLogService: OperationLogService) {}

  @Get()
  @ApiOperation({ summary: '操作日志列表' })
  @Perm(operationLogPermissions.LIST)
  list(@Query() query: OperationLogQueryDto) {
    return this.operationLogService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '操作日志详情' })
  @Perm(operationLogPermissions.READ)
  detail(@Param() { id }: IdParam) {
    return this.operationLogService.detail(BigInt(id));
  }

  @Post('clean')
  @ApiOperation({ summary: '清理过期操作日志' })
  @Perm(operationLogPermissions.DELETE)
  clean(@Body() dto: CleanOperationLogDto) {
    return this.operationLogService.clean(dto);
  }
}
