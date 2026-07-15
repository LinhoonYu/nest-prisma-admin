import { Module } from '@nestjs/common';
import { LoggerModule } from '~/common/logger/logger.module';
import { PrismaModule } from '~/shared/prisma/prisma.module';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [LoggerModule, PrismaModule],
  providers: [BootstrapService],
})
export class BootstrapModule {}
