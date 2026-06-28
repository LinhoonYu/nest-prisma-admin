import { AppConfig, appRegToken, IAppConfig } from './app.config';
import {
  ISecurityConfig,
  SecurityConfig,
  securityRegToken,
} from './security.config';
import {
  ISwaggerConfig,
  SwaggerConfig,
  swaggerRegToken,
} from './swagger.config';

export * from './app.config';
export * from './security.config';
export * from './swagger.config';

export interface AllConfigType {
  [appRegToken]: IAppConfig;
  [securityRegToken]: ISecurityConfig;
  [swaggerRegToken]: ISwaggerConfig;
}

export default {
  AppConfig,
  SecurityConfig,
  SwaggerConfig,
};
