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
  SystemDataCodeImmutable = 1014,
  ProtectedUser = 1015,

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

  // 通知相关 6xxx
  NoticeNotFound = 6001,
  NoticeAlreadyPublished = 6002,
  NoticeNotPublished = 6003,
  NoticeSendTimeRequired = 6004,
  NoticeSendTimePast = 6005,
  NoticeMqUnavailable = 6006,
  NoticeNotFailed = 6007,

  // 系统配置相关 7xxx
  ConfigNotFound = 7001,
  DuplicateConfigKey = 7002,
  SystemConfigCannotModify = 7003,

  // OAuth 相关 8xxx
  OAuthProviderDisabled = 8001,
  OAuthProviderNotFound = 8002,
  OAuthStateInvalid = 8003,
  OAuthCodeExchangeFailed = 8004,
  OAuthUserInfoFailed = 8005,
  OAuthExchangeCodeInvalid = 8006,
  OAuthIdentityAlreadyBound = 8007,
  OAuthProviderAlreadyLinked = 8008,
  OAuthCannotUnbindLastIdentity = 8009,

  /** OAuth 待处理码无效或已过期 */
  OAuthPendingInvalid = 8010,
}
