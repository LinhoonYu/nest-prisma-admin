import { Module } from '@nestjs/common';

import { OperationLogController } from './operation-log.controller';
import { OperationLogInterceptor } from './operation-log.interceptor';
import { OperationLogService } from './operation-log.service';

@Module({
  controllers: [OperationLogController],
  providers: [OperationLogService, OperationLogInterceptor],
  exports: [OperationLogService, OperationLogInterceptor],
})
export class OperationLogModule {}
