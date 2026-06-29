import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/** BigInt 字段同时支持 null（清空父级）的自定义转换 */
const BigIntOrNull = ({ value }: { value: unknown }) =>
  value === null
    ? null
    : value != null
      ? BigInt(value as string | number)
      : undefined;

/** 手机号宽松校验：支持国际格式 +86... 或纯数字 7-15 位 */
const PHONE_REGEX = /^\+?\d{7,15}$/;

export class CreateDeptDto {
  @ApiProperty({
    description: '父部门 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Type(() => BigInt)
  @IsOptional()
  parentId?: bigint;

  @ApiProperty({ description: '部门名称' })
  @IsString()
  @MaxLength(64)
  name: string;

  @ApiProperty({ description: '部门编码' })
  @IsString()
  @MaxLength(64)
  code: string;

  @ApiProperty({ description: '排序', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort: number = 0;

  @ApiProperty({
    description: '负责人 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Type(() => BigInt)
  @IsOptional()
  leaderUserId?: bigint;

  @ApiProperty({ description: '联系电话', required: false })
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: '手机号格式不正确' })
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiProperty({ description: '状态：0=禁用 1=启用', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  status: number = 1;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}

export class UpdateDeptDto {
  @ApiProperty({
    description: '父部门 ID（传 null 清空父级，BigInt 字符串）',
    required: false,
    type: String,
    nullable: true,
    example: '1',
  })
  @Transform(BigIntOrNull)
  @IsOptional()
  parentId?: bigint | null;

  @ApiProperty({ description: '部门名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @ApiProperty({ description: '部门编码', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @ApiProperty({ description: '排序', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiProperty({
    description: '负责人 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Type(() => BigInt)
  @IsOptional()
  leaderUserId?: bigint;

  @ApiProperty({ description: '联系电话', required: false })
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: '手机号格式不正确' })
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiProperty({ description: '状态', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}

export class DeptQueryDto {
  @ApiProperty({ description: '部门名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '部门编码', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '状态', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  status?: number;
}
