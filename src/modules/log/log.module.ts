import { Module } from '@nestjs/common';

import { LoginLogModule } from './login-log/login-log.module';
import { OperationLogModule } from './operation-log/operation-log.module';

@Module({
  imports: [LoginLogModule, OperationLogModule],
})
export class LogModule {}
