import { Module } from '@nestjs/common';

import { WsModule } from '~/modules/ws/ws.module';

import { MyNoticeController } from './my-notice.controller';
import { MyNoticeService } from './my-notice.service';
import { NoticeConsumer } from './notice.consumer';
import { NoticeController } from './notice.controller';
import { NoticeProducer } from './notice.producer';
import { NoticeService } from './notice.service';

@Module({
  imports: [WsModule],
  controllers: [NoticeController, MyNoticeController],
  providers: [NoticeService, MyNoticeService, NoticeProducer, NoticeConsumer],
  exports: [NoticeService],
})
export class NoticeModule {}
