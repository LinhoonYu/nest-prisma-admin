import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
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
    description: '发布状态：0=草稿 1=已发布 2=定时发布中 -1=已撤回',
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  publishStatus?: number;

  @ApiProperty({
    description: '发送状态：0=待发送 2=已完成 -1=失败 -2=已过期',
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  sendStatus?: number;
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

  @ApiProperty({ description: '发送模式：1=即时 2=定时', default: 1 })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  sendMode: number = 1;

  @ApiProperty({ description: '定时发送时间（ISO 8601）', required: false })
  @IsOptional()
  @IsDateString()
  sendTime?: string;

  @ApiProperty({ description: '有效天数，过期后不再推送', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  expireDays?: number;
}

export class UpdateNoticeDto extends PartialType(CreateNoticeDto) {}
