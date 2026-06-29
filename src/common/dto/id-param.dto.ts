import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * BigInt 主键参数基类。
 * 因为 schema 主键是 BigInt，URL 参数走 string，不在 DTO 层做 string → BigInt 转换，
 * 具体转换留到 service 层用 BigInt(id) 处理。
 */
export class IdParam {
  @ApiProperty({
    description: '记录 ID（BigInt 字符串）',
    example: '1',
  })
  @IsString()
  id: string;
}
