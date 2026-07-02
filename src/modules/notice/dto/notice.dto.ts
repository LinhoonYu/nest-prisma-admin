import { ApiProperty, PartialType } from '@nestjs/swagger';
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

export class NoticeQueryDto extends PagerDto {
  @ApiProperty({ description: '通知标题', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: '发布状态：0=草稿 1=已发布 -1=已撤回',
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  publishStatus?: number;
}

export class CreateNoticeDto {
  @ApiProperty({ description: '通知标题' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: '通知内容（富文本 HTML）' })
  @IsString()
  content: string;

  @ApiProperty({ description: '通知类型' })
  @Type(() => Number)
  @IsInt()
  type: number;

  @ApiProperty({ description: '通知等级', default: 'L' })
  @IsString()
  @MaxLength(32)
  level: string = 'L';

  @ApiProperty({ description: '目标类型：1=全体 2=指定用户', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetType: number = 1;

  @ApiProperty({
    description: '指定用户 ID 列表',
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  targetUserIds?: number[];
}

export class UpdateNoticeDto extends PartialType(CreateNoticeDto) {}
