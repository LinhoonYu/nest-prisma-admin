import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

import { PagerDto } from '~/common/dto/pager.dto';

export class MyNoticeQueryDto extends PagerDto {
  @ApiProperty({ description: '通知标题', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ description: '是否已读：0=未读 1=已读', required: false })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  isRead?: number;
}
