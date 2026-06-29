import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { PagerDto } from '~/common/dto/pager.dto';

/** 手机号宽松校验：支持国际格式 +86... 或纯数字 7-15 位 */
const PHONE_REGEX = /^\+?\d{7,15}$/;

export class CreateUserDto {
  @ApiProperty({ description: '登录账号' })
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  username: string;

  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @ApiProperty({ description: '真实姓名', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  realName?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: '手机号格式不正确' })
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ description: '性别：0=未知 1=男 2=女', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gender: number = 0;

  @ApiProperty({
    description: '部门 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Type(() => BigInt)
  @IsOptional()
  deptId?: bigint;

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

  @ApiProperty({ description: '初始密码' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class UpdateUserDto {
  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @ApiProperty({ description: '真实姓名', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  realName?: string;

  @ApiProperty({ description: '头像', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatar?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: '手机号格式不正确' })
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ description: '性别', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  gender?: number;

  @ApiProperty({
    description: '部门 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Type(() => BigInt)
  @IsOptional()
  deptId?: bigint;

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

export class UserQueryDto extends PagerDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({
    description: '部门 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Type(() => BigInt)
  @IsOptional()
  deptId?: bigint;

  @ApiProperty({ description: '状态', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  status?: number;
}

export class AssignRolesDto {
  @ApiProperty({
    description: '角色 ID 列表（BigInt 字符串数组）',
    type: [String],
    example: ['1', '2'],
  })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(0)
  roleIds: bigint[];
}

export class AssignDataScopeDto {
  @ApiProperty({
    description: '数据范围：1=全部 2=本人 3=本部门 4=本部门及以下 5=自定义',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  dataScope: number;

  @ApiProperty({
    description: '自定义部门 ID 列表（dataScope=5 时有效，BigInt 字符串数组）',
    type: [String],
    required: false,
    example: ['1', '2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  deptIds?: bigint[];
}

export class ResetPasswordDto {
  @ApiProperty({ description: '新密码' })
  @IsString()
  @MinLength(6)
  password: string;
}
