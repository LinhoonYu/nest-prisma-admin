import { Controller, Delete, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { Perm } from '~/common/decorators/perm.decorator';
import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
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
  async upload(request: FastifyRequest, @CurrentUser('userId') userId: string) {
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
}
