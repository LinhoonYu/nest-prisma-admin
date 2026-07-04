import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username: string;

  @ApiProperty({
    description: '密码（RSA 关闭时为明文，开启时为加密密文）',
    example: '123456',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  password: string;

  @ApiPropertyOptional({ description: '验证码 key' })
  @IsString()
  @IsOptional()
  captchaKey?: string;

  @ApiPropertyOptional({ description: '验证码' })
  @IsString()
  @IsOptional()
  captchaCode?: string;
}
