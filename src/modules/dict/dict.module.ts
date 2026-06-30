import { Module } from '@nestjs/common';

import { DictItemModule } from './dict-item/dict-item.module';
import { DictTypeModule } from './dict-type/dict-type.module';

@Module({
  imports: [DictTypeModule, DictItemModule],
})
export class DictModule {}
