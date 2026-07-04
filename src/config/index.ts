import { AppConfig, appRegToken, IAppConfig } from './app.config';
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
export * from './oauth.config';
export * from './rabbitmq.config';
export * from './security.config';
export * from './storage.config';
export * from './swagger.config';

export interface AllConfigType {
  [appRegToken]: IAppConfig;
  [oauthRegToken]: IOauthConfig;
  [rabbitmqRegToken]: IRabbitmqConfig;
  [securityRegToken]: ISecurityConfig;
  [storageRegToken]: IStorageConfig;
  [swaggerRegToken]: ISwaggerConfig;
}

export default {
  AppConfig,
  OauthConfig,
  RabbitmqConfig,
  SecurityConfig,
  StorageConfig,
  SwaggerConfig,
};
