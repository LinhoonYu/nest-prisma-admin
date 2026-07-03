/**
 * BigInt 序列化 replacer，解决 JSON.stringify 无法序列化 BigInt 的问题。
 * 在响应拦截器中调用即可。
 */
export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

/**
 * BigInt 字段的 class-transformer 转换器，用于 Create/Update DTO。
 * 空字符串 / null → null（清空可空外键），undefined → undefined（未传字段）。
 * 前端可能传空字符串表示"无值"，@Type(() => BigInt) 会把空串原样透传给 Prisma 导致校验失败。
 */
export const BigIntOrNull = ({
  value,
}: {
  value: unknown;
}): bigint | null | undefined => {
  if (value === null || value === '') return null;
  if (value === undefined) return undefined;
  return BigInt(value as string | number);
};

/**
 * BigInt 字段的 class-transformer 转换器，用于 Query DTO。
 * 空字符串 / null / undefined → undefined（不参与查询条件）。
 */
export const BigIntOrUndefined = ({
  value,
}: {
  value: unknown;
}): bigint | undefined => {
  if (value === null || value === '' || value === undefined) return undefined;
  return BigInt(value as string | number);
};
