import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { PagerDto } from '~/common/dto/pager.dto';

export class CreateDictItemDto {
  @ApiProperty({
    description: '字典类型 ID（BigInt 字符串）',
    type: String,
    example: '1',
  })
  @Type(() => BigInt)
  dictTypeId: bigint;

  @ApiProperty({ description: '字典项标签' })
  @IsString()
  @MaxLength(128)
  label: string;

  @ApiProperty({ description: '字典项值' })
  @IsString()
  @MaxLength(128)
  value: string;

  @ApiProperty({ description: '颜色', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiProperty({ description: 'CSS 类名', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  cssClass?: string;

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

  @ApiProperty({ description: '是否默认', default: false })
  @IsBoolean()
  isDefault: boolean = false;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}

export class UpdateDictItemDto {
  @ApiProperty({ description: '字典项标签', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;

  @ApiProperty({ description: '字典项值', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  value?: string;

  @ApiProperty({ description: '颜色', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiProperty({ description: 'CSS 类名', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  cssClass?: string;

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

  @ApiProperty({ description: '是否默认', required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}

export class DictItemQueryDto extends PagerDto {
  @ApiProperty({
    description: '字典类型 ID（BigInt 字符串）',
    required: false,
    type: String,
    example: '1',
  })
  @Type(() => BigInt)
  @IsOptional()
  dictTypeId?: bigint;

  @ApiProperty({ description: '标签', required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: '值', required: false })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({ description: '状态', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  status?: number;
}
