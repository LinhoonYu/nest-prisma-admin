import { Module } from '@nestjs/common';

import { AuthModule } from '~/modules/auth/auth.module';

import { LoginLogConsumer } from './login-log.consumer';
import { LoginLogController } from './login-log.controller';
import { LoginLogListener } from './login-log.listener';
import { LoginLogProducer } from './login-log.producer';
import { LoginLogService } from './login-log.service';

@Module({
  imports: [AuthModule],
  controllers: [LoginLogController],
  providers: [
    LoginLogConsumer,
    LoginLogListener,
    LoginLogProducer,
    LoginLogService,
  ],
  exports: [LoginLogProducer, LoginLogService],
})
export class LoginLogModule {}
