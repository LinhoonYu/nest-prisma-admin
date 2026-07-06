-- Session 和 RefreshToken 迁移到 Redis，删除数据库表

DROP TABLE IF EXISTS "refresh_tokens";
DROP TABLE IF EXISTS "auth_sessions";
