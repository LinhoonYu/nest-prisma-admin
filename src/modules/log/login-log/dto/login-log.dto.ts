import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { PagerDto } from '~/common/dto/pager.dto';
import { BigIntOrUndefined } from '~/common/utils/bigint';

export class LoginLogQueryDto extends PagerDto {
  @ApiProperty({
    description: '用户 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Transform(BigIntOrUndefined)
  @IsOptional()
  userId?: bigint;

  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  username?: string;

  @ApiProperty({ description: '登录方式', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  loginType?: number;

  @ApiProperty({ description: 'IP', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  ip?: string;

  @ApiProperty({ description: '状态：0=失败 1=成功', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number;

  @ApiProperty({
    description: '起始时间（ISO 8601）',
    required: false,
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({
    description: '结束时间（ISO 8601）',
    required: false,
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endTime?: string;
}

export class CleanLoginLogDto {
  @ApiProperty({ description: '保留最近天数', default: 90 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  keepDays: number = 90;
}
