import { Module } from '@nestjs/common';

import { OperationLogConsumer } from './operation-log.consumer';
import { OperationLogController } from './operation-log.controller';
import { OperationLogInterceptor } from './operation-log.interceptor';
import { OperationLogService } from './operation-log.service';

@Module({
  controllers: [OperationLogController],
  providers: [
    OperationLogConsumer,
    OperationLogService,
    OperationLogInterceptor,
  ],
  exports: [OperationLogService, OperationLogInterceptor],
})
export class OperationLogModule {}
