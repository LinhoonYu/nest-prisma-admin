import { IsOptional, IsString, MinLength } from 'class-validator';

export class BindIdentityDto {
  @IsString()
  @MinLength(1)
  provider: string;

  @IsString()
  @MinLength(1)
  code: string;

  @IsOptional()
  @IsString()
  state?: string;
}
