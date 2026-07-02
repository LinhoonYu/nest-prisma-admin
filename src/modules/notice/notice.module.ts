import { Module } from '@nestjs/common';

import { WsModule } from '~/modules/ws/ws.module';

import { MyNoticeController } from './my-notice.controller';
import { MyNoticeService } from './my-notice.service';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';

@Module({
  imports: [WsModule],
  controllers: [NoticeController, MyNoticeController],
  providers: [NoticeService, MyNoticeService],
  exports: [NoticeService],
})
export class NoticeModule {}
