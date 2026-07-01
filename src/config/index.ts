import { AppConfig, appRegToken, IAppConfig } from './app.config';
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
export * from './security.config';
export * from './storage.config';
export * from './swagger.config';

export interface AllConfigType {
  [appRegToken]: IAppConfig;
  [securityRegToken]: ISecurityConfig;
  [storageRegToken]: IStorageConfig;
  [swaggerRegToken]: ISwaggerConfig;
}

export default {
  AppConfig,
  SecurityConfig,
  StorageConfig,
  SwaggerConfig,
};
