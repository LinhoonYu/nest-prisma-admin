import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({ description: '刷新令牌' })
  @IsString()
  refreshToken: string;
}
