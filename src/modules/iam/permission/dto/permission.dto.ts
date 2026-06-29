import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { PagerDto } from '~/common/dto/pager.dto';

export class CreatePermissionDto {
  @ApiProperty({ description: '权限编码' })
  @IsString()
  @MaxLength(128)
  code: string;

  @ApiProperty({ description: '权限名称' })
  @IsString()
  @MaxLength(128)
  name: string;

  @ApiProperty({ description: '分组', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  group?: string;

  @ApiProperty({ description: 'HTTP 方法', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  method?: string;

  @ApiProperty({ description: '接口路径', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @ApiProperty({ description: '排序', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort: number = 0;

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

export class UpdatePermissionDto {
  @ApiProperty({ description: '权限编码', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  code?: string;

  @ApiProperty({ description: '权限名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiProperty({ description: '分组', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  group?: string;

  @ApiProperty({ description: 'HTTP 方法', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  method?: string;

  @ApiProperty({ description: '接口路径', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @ApiProperty({ description: '排序', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

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

export class PermissionQueryDto extends PagerDto {
  @ApiProperty({ description: '权限名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '权限编码', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '分组', required: false })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiProperty({ description: '状态', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  status?: number;
}
