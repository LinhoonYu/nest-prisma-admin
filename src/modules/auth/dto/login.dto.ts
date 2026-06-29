import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username: string;

  @ApiPropertyOptional({ description: '明文密码（RSA 关闭时使用，开发环境）' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'RSA 加密后的密码（Base64 编码），RSA 开启时必传',
  })
  @IsString()
  @IsOptional()
  encPassword?: string;

  @ApiPropertyOptional({ description: '验证码 key' })
  @IsString()
  @IsOptional()
  captchaKey?: string;

  @ApiPropertyOptional({ description: '验证码' })
  @IsString()
  @IsOptional()
  captchaCode?: string;
}
