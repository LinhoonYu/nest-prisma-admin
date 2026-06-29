import { AsyncLocalStorage } from 'node:async_hooks';

interface SoftDeleteContext {
  /** 查询时包含已软删除的记录 */
  includeDeleted?: boolean;
  /** 执行真正的硬删除，跳过软删除拦截 */
  hardDelete?: boolean;
}

const storage = new AsyncLocalStorage<SoftDeleteContext>();

/**
 * 在回调内查询时包含已软删除的记录。
 *
 * @example
 * const all = await includeDeleted(() => prisma.user.findMany())
 */
export function includeDeleted<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ includeDeleted: true }, fn);
}

/**
 * 在回调内执行真正的硬删除，跳过软删除转换。
 *
 * @example
 * await hardDelete(() => prisma.user.delete({ where: { id } }))
 */
export function hardDelete<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ hardDelete: true }, fn);
}

export function isIncludingDeleted(): boolean {
  return storage.getStore()?.includeDeleted === true;
}

export function isHardDelete(): boolean {
  return storage.getStore()?.hardDelete === true;
}
