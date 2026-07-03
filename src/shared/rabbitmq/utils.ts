/**
 * 序列化包含 BigInt 的对象，使其可被 JSON.stringify 安全处理。
 * BigInt 值会被转为字符串。
 */
export function serializeBigInt(data: unknown): unknown {
  const json = JSON.stringify(data, (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
  return JSON.parse(json) as unknown;
}
