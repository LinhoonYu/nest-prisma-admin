import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'isPublic';

/**
 * 标记该路由不需要 JWT 认证。
 * 配合 JwtAuthGuard 使用：Guard 检查此 metadata 后跳过校验。
 */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
