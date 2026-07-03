import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { PagerDto } from '~/common/dto/pager.dto';

export class CreateConfigDto {
  @ApiProperty({ description: '配置名称' })
  @IsString()
  @MaxLength(64)
  configName: string;

  @ApiProperty({ description: '配置键', example: 'sys.site.title' })
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_:.-]*$/, {
    message: '配置键只能包含字母、数字、下划线、冒号、点和短横线',
  })
  configKey: string;

  @ApiProperty({ description: '配置值' })
  @IsString()
  @MaxLength(512)
  configValue: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}

export class UpdateConfigDto extends PartialType(CreateConfigDto) {}

export class ConfigQueryDto extends PagerDto {
  @ApiProperty({ description: '关键字（配置名称/配置键）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keywords?: string;
}
