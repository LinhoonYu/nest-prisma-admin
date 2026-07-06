import { IsString, MinLength } from 'class-validator';

export class OAuthRegisterDto {
  @IsString()
  @MinLength(1)
  pendingCode: string;
}
