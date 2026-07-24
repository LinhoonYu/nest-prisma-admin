import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { BigIntOrNull } from '~/common/utils/bigint';

export class CreateMenuDto {
  @ApiProperty({
    description: '父菜单 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Transform(BigIntOrNull)
  @IsOptional()
  parentId?: bigint | null;

  @ApiProperty({ description: '类型：1=目录 2=菜单 3=链接 4=iframe' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  type: number;

  @ApiProperty({ description: '路由名称（唯一）' })
  @IsString()
  @MaxLength(128)
  name: string;

  @ApiProperty({
    description: '多语言标题',
    example: { 'zh-cn': '系统管理', en: 'System' },
  })
  @IsObject()
  titles: Record<string, string>;

  @ApiProperty({ description: '路由路径', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @ApiProperty({ description: '组件路径', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  component?: string;

  @ApiProperty({ description: '重定向路径', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  redirect?: string;

  @ApiProperty({ description: '图标', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  icon?: string;

  @ApiProperty({ description: '排序', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort: number = 0;

  @ApiProperty({ description: '是否隐藏：0=显示 1=隐藏', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  hidden: number = 0;

  @ApiProperty({ description: '是否缓存：0=否 1=是', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  keepAlive: number = 0;

  @ApiProperty({ description: '始终显示：0=否 1=是', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  alwaysShow: number = 0;

  @ApiProperty({ description: '外链 URL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  externalUrl?: string;

  @ApiProperty({
    description: '高亮菜单 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Transform(BigIntOrNull)
  @IsOptional()
  activeMenuId?: bigint | null;

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

export class UpdateMenuDto {
  @ApiProperty({
    description: '父菜单 ID（传 null 清空父级，BigInt 字符串）',
    required: false,
    type: String,
    nullable: true,
    example: '1',
  })
  @Transform(BigIntOrNull)
  @IsOptional()
  parentId?: bigint | null;

  @ApiProperty({ description: '类型', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  type?: number;

  @ApiProperty({ description: '路由名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiProperty({ description: '多语言标题', required: false })
  @IsOptional()
  @IsObject()
  titles?: Record<string, string>;

  @ApiProperty({ description: '路由路径', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @ApiProperty({ description: '组件路径', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  component?: string;

  @ApiProperty({ description: '重定向路径', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  redirect?: string;

  @ApiProperty({ description: '图标', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  icon?: string;

  @ApiProperty({ description: '排序', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiProperty({ description: '是否隐藏', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  hidden?: number;

  @ApiProperty({ description: '是否缓存', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  keepAlive?: number;

  @ApiProperty({ description: '始终显示', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  alwaysShow?: number;

  @ApiProperty({ description: '外链 URL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  externalUrl?: string;

  @ApiProperty({
    description: '高亮菜单 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Transform(BigIntOrNull)
  @IsOptional()
  activeMenuId?: bigint | null;

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

export class MenuQueryDto {
  @ApiProperty({ description: '标题', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '类型', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  type?: number;

  @ApiProperty({ description: '状态', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  status?: number;
}
