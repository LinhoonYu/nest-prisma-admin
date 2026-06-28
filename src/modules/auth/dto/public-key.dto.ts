import { ApiProperty } from '@nestjs/swagger';

export class PublicKeyVo {
  @ApiProperty({ description: 'RSA 公钥（PEM 格式，SPKI 编码）' })
  publicKey: string;
}
