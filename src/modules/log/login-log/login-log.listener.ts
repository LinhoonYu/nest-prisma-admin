import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UAParser } from 'ua-parser-js';

import { AppLogger } from '~/common/logger/app-logger';
import { LoginLogProducer } from './login-log.producer';
import { LoginLogRecord, LoginLogService } from './login-log.service';

export interface LoginEventPayload {
  userId?: bigint;
  username: string;
  loginType: number;
  provider?: string;
  ip: string;
  userAgent: string;
  status: number;
  failureReason?: string;
}

@Injectable()
export class LoginLogListener {
  constructor(
    private loginLogProducer: LoginLogProducer,
    private loginLogService: LoginLogService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(LoginLogListener.name);
  }

  @OnEvent('auth.login')
  async handleLoginEvent(payload: LoginEventPayload) {
    const parser = new UAParser(payload.userAgent);
    const record: LoginLogRecord = {
      userId: payload.userId,
      username: payload.username,
      loginType: payload.loginType,
      provider: payload.provider,
      ip: payload.ip,
      userAgent: payload.userAgent,
      browser: parser.getBrowser().name || undefined,
      os: parser.getOS().name || undefined,
      device: parser.getDevice().model || undefined,
      status: payload.status,
      failureReason: payload.failureReason,
    };

    try {
      await this.loginLogProducer.send(record);
    } catch {
      this.logger.warn('MQ unavailable, falling back to direct write');
      await this.loginLogService.record(record);
    }
  }
}
