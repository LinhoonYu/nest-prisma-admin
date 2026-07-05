import { AppConfig, appRegToken, IAppConfig } from './app.config';
import { ILogConfig, LogConfig, logRegToken } from './log.config';
import { IOauthConfig, OauthConfig, oauthRegToken } from './oauth.config';
import {
  IRabbitmqConfig,
  RabbitmqConfig,
  rabbitmqRegToken,
} from './rabbitmq.config';
import {
  ISecurityConfig,
  SecurityConfig,
  securityRegToken,
} from './security.config';
import {
  IStorageConfig,
  StorageConfig,
  storageRegToken,
} from './storage.config';
import {
  ISwaggerConfig,
  SwaggerConfig,
  swaggerRegToken,
} from './swagger.config';

export * from './app.config';
export * from './log.config';
export * from './oauth.config';
export * from './rabbitmq.config';
export * from './security.config';
export * from './storage.config';
export * from './swagger.config';

export interface AllConfigType {
  [appRegToken]: IAppConfig;
  [logRegToken]: ILogConfig;
  [oauthRegToken]: IOauthConfig;
  [rabbitmqRegToken]: IRabbitmqConfig;
  [securityRegToken]: ISecurityConfig;
  [storageRegToken]: IStorageConfig;
  [swaggerRegToken]: ISwaggerConfig;
}

export default {
  AppConfig,
  LogConfig,
  OauthConfig,
  RabbitmqConfig,
  SecurityConfig,
  StorageConfig,
  SwaggerConfig,
};
