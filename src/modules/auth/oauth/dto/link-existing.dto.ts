import { IsString, MaxLength, MinLength } from 'class-validator';

export class LinkExistingDto {
  @IsString()
  @MinLength(1)
  pendingCode: string;

  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  password: string;
}
