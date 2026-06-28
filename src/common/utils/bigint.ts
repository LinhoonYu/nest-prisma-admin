/**
 * BigInt 序列化 replacer，解决 JSON.stringify 无法序列化 BigInt 的问题。
 * 在响应拦截器中调用即可。
 */
export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}
