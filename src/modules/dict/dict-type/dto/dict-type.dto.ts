import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { PagerDto } from '~/common/dto/pager.dto';

export class CreateDictTypeDto {
  @ApiProperty({ description: '字典编码' })
  @IsString()
  @MaxLength(64)
  code: string;

  @ApiProperty({ description: '字典名称' })
  @IsString()
  @MaxLength(64)
  name: string;

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

export class UpdateDictTypeDto {
  @ApiProperty({ description: '字典编码', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @ApiProperty({ description: '字典名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

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

export class DictTypeQueryDto extends PagerDto {
  @ApiProperty({ description: '字典编码', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '字典名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '状态', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  status?: number;
}
