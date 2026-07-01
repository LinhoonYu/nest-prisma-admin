import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FileUploadResultDto {
  @ApiProperty({ description: '文件 ID' })
  id: string;

  @ApiProperty({ description: '原始文件名' })
  name: string;

  @ApiProperty({ description: '存储 key' })
  key: string;

  @ApiProperty({ description: '文件大小（字节）' })
  size: string;

  @ApiProperty({ description: 'MIME 类型' })
  mimeType: string;
}

export class FilePresignResultDto {
  @ApiProperty({ description: '原始文件名' })
  name: string;

  @ApiProperty({ description: 'MIME 类型' })
  mimeType: string;

  @ApiProperty({ description: '预签名 URL' })
  url: string;
}

export class FilePresignDto {
  @ApiProperty({ description: '文件存储 key' })
  @IsString()
  key: string;
}

export class FileDeleteDto {
  @ApiProperty({ description: '文件存储 key' })
  @IsString()
  key: string;
}
