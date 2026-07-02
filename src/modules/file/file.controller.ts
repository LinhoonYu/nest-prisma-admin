import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { Perm } from '~/common/decorators/perm.decorator';
import { Public } from '~/common/decorators/public.decorator';
import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { IdParam } from '~/common/dto/id-param.dto';
import { RawResponse } from '~/common/interceptors/transform.interceptor';
import { FileService } from './file.service';
import { filePermissions } from './file.permissions';
import {
  FileDeleteDto,
  FilePresignDto,
  FilePresignResultDto,
  FileUploadResultDto,
} from './dto/file.dto';

@ApiTags('文件管理')
@Controller('files')
export class FileController {
  constructor(private fileService: FileService) {}

  @Post()
  @ApiOperation({ summary: '上传文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ type: FileUploadResultDto })
  @Perm(filePermissions.UPLOAD)
  async upload(
    @Req() request: FastifyRequest,
    @CurrentUser('userId') userId: string,
  ) {
    const file = await request.file();
    if (!file) throw new ApiException(ApiCode.BadRequest, '未收到文件');

    const buffer = await file.toBuffer();
    return this.fileService.upload(
      {
        originalName: file.filename,
        mimeType: file.mimetype,
        buffer,
      },
      BigInt(userId),
    );
  }

  @Delete()
  @ApiOperation({ summary: '删除文件' })
  @ApiOkResponse({ description: '删除成功' })
  @Perm(filePermissions.DELETE)
  remove(@Query() dto: FileDeleteDto) {
    return this.fileService.delete(dto.key);
  }

  @Get('presign')
  @ApiOperation({ summary: '获取文件预签名 URL' })
  @ApiOkResponse({ type: FilePresignResultDto })
  @Perm(filePermissions.READ)
  presign(@Query() dto: FilePresignDto) {
    return this.fileService.presign(dto.key);
  }

  @Get('proxy/:id')
  @Public()
  @RawResponse()
  @ApiOperation({ summary: '代理访问文件（流式返回）' })
  async proxy(@Param() { id }: IdParam, @Res() reply: FastifyReply) {
    const { stream, mimeType } = await this.fileService.getStreamById(
      BigInt(id),
    );
    stream.on('error', () => {
      if (!reply.sent) reply.code(502).send({ message: '文件流读取失败' });
    });
    reply
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .type(mimeType)
      .send(stream);
  }
}
