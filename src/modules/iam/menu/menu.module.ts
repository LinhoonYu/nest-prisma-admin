import { Module } from '@nestjs/common';

import { AuthModule } from '~/modules/auth/auth.module';

import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [AuthModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
