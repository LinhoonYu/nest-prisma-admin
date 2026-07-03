import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuthModule } from '~/modules/auth/auth.module';

import { OperationLogConsumer } from './operation-log.consumer';
import { OperationLogController } from './operation-log.controller';
import { OperationLogInterceptor } from './operation-log.interceptor';
import { OperationLogService } from './operation-log.service';

@Module({
  imports: [AuthModule],
  controllers: [OperationLogController],
  providers: [
    OperationLogConsumer,
    OperationLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
  ],
  exports: [OperationLogService],
})
export class OperationLogModule {}
