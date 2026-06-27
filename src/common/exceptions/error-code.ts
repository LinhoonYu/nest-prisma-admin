export enum ApiCode {
  Success = 0,
  Error = 1,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  TooManyRequests = 429,
  InternalServerError = 500,

  // 业务错误码 1xxx
  AccountDisabled = 1001,
  AccountExpired = 1002,
  AccountNotFound = 1003,
  PasswordError = 1004,
  CaptchaError = 1005,
  TokenExpired = 1006,
  TokenInvalid = 1007,
  TokenMissing = 1008,
  AccountOrPasswordError = 1009,
  DuplicateUsername = 1010,
  DuplicateEmail = 1011,

  // 权限相关 2xxx
  NoPermission = 2001,
  RoleNotFound = 2002,
  MenuNotFound = 2003,
}
