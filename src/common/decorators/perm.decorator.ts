import { SetMetadata } from '@nestjs/common';

export const PERM_KEY = 'permissions';

/**
 * 标记路由需要的权限标识。
 * 支持 OR 语义（用户拥有任一权限即通过），AND 语义后续扩展。
 *
 * @example
 * @Perm('user:create')                // 单一权限
 * @Perm('user:create', 'user:edit')   // 任一权限
 */
export const Perm = (...codes: string[]) => SetMetadata(PERM_KEY, codes);
