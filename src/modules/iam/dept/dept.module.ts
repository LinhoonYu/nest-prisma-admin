import { Module } from '@nestjs/common';

import { AuthModule } from '~/modules/auth/auth.module';

import { DeptController } from './dept.controller';
import { DeptService } from './dept.service';

@Module({
  imports: [AuthModule],
  controllers: [DeptController],
  providers: [DeptService],
  exports: [DeptService],
})
export class DeptModule {}
