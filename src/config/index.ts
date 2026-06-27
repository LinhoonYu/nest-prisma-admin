import { AppConfig, appRegToken, IAppConfig } from './app.config'
import { ISwaggerConfig, SwaggerConfig, swaggerRegToken } from './swagger.config'

export * from './app.config'
export * from './swagger.config'

export interface AllConfigType {
  [appRegToken]: IAppConfig
  [swaggerRegToken]: ISwaggerConfig
}

export default {
  AppConfig,
  SwaggerConfig,
}
