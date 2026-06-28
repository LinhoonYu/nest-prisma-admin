import { IsString } from 'class-validator';

/**
 * BigInt 主键参数基类。
 * 因为 schema 主键是 BigInt，URL 参数走 string，不在 DTO 层做 string → BigInt 转换，
 * 具体转换留到 service 层用 BigInt(id) 处理。
 */
export class IdParam {
  @IsString()
  id: string;
}
