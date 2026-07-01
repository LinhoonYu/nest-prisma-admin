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
  AccountLocked = 1012,
  BadRequest = 1013,

  // 权限相关 2xxx
  NoPermission = 2001,
  RoleNotFound = 2002,
  MenuNotFound = 2003,
  DeptNotFound = 2004,
  DictNotFound = 2005,
  PermissionNotFound = 2006,
  UserNotFound = 2007,

  // 会话相关 3xxx
  SessionExpired = 3001,
  SessionRevoked = 3002,
  TokenBlacklisted = 3003,
  RefreshTokenReuseDetected = 3004,
  RefreshTokenInvalid = 3005,
  MustChangePassword = 3006,

  // RSA 加密相关 4xxx
  RsaDisabled = 4001,
  RsaPublicKeyUnavailable = 4002,
  RsaDecryptFailed = 4003,

  // 文件相关 5xxx
  FileNotFound = 5001,
  FileTooLarge = 5002,
}
