import { Inject, Injectable, Scope } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

// TRANSIENT scope：每个注入方拿到独立实例，setContext 互不影响
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger {
  private context?: string;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}

  setContext(context: string) {
    this.context = context;
  }

  debug(msg: string, meta?: Record<string, unknown>) {
    this.logger.debug(msg, { context: this.context, ...meta });
  }

  info(msg: string, meta?: Record<string, unknown>) {
    this.logger.info(msg, { context: this.context, ...meta });
  }

  warn(msg: string, meta?: Record<string, unknown>) {
    this.logger.warn(msg, { context: this.context, ...meta });
  }

  error(msg: string, meta?: Record<string, unknown>) {
    this.logger.error(msg, { context: this.context, ...meta });
  }
}
