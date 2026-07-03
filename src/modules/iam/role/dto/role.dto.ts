import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { PagerDto } from '~/common/dto/pager.dto';

export class CreateRoleDto {
  @ApiProperty({ description: '角色编码' })
  @IsString()
  @MaxLength(64)
  code: string;

  @ApiProperty({ description: '角色名称' })
  @IsString()
  @MaxLength(64)
  name: string;

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

export class UpdateRoleDto {
  @ApiProperty({ description: '角色编码', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @ApiProperty({ description: '角色名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

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

export class RoleQueryDto extends PagerDto {
  @ApiProperty({ description: '角色名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '角色编码', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '状态', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  status?: number;
}

export class AssignMenusDto {
  @ApiProperty({
    description: '菜单 ID 列表（字符串数组）',
    type: [String],
    example: ['1', '2'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  menuIds: string[];
}

export class AssignPermissionsDto {
  @ApiProperty({
    description: '权限 ID 列表（字符串数组）',
    type: [String],
    example: ['1', '2'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  permissionIds: string[];
}
