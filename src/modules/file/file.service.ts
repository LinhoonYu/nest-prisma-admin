import { Inject, Injectable, Logger } from '@nestjs/common';
import { extname } from 'path';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { IStorageConfig, StorageConfig } from '~/config';
import { PrismaService } from '~/shared/prisma/prisma.service';
import { S3Service } from '~/shared/s3/s3.service';

export interface UploadedFile {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    @Inject(StorageConfig.KEY) private storageConfig: IStorageConfig,
  ) {}

  async upload(file: UploadedFile, userId: bigint) {
    if (file.buffer.length > this.storageConfig.maxFileSize * 1024 * 1024) {
      throw new ApiException(
        ApiCode.FileTooLarge,
        `文件大小不能超过 ${this.storageConfig.maxFileSize}MB`,
      );
    }

    const ext = extname(file.originalName);
    const datePrefix = dayjs().format('YYYY-MM');
    const key = `uploads/${datePrefix}/${nanoid(16)}${ext}`;

    await this.s3.upload(file.buffer, key, file.mimeType);

    try {
      const record = await this.prisma.file.create({
        data: {
          originalName: file.originalName,
          objectKey: key,
          mimeType: file.mimeType,
          size: BigInt(file.buffer.length),
          bucketName: this.storageConfig.bucket,
          createdBy: userId,
        },
      });

      return {
        id: record.id.toString(),
        name: record.originalName,
        key: record.objectKey,
        size: record.size.toString(),
        mimeType: record.mimeType,
      };
    } catch (err) {
      this.logger.error(`DB 记录创建失败，回滚 S3 文件: ${key}`, err);
      await this.s3.delete(key).catch(() => undefined);
      throw err;
    }
  }

  async delete(key: string) {
    const file = await this.prisma.file.findUnique({
      where: { objectKey: key },
      select: { id: true },
    });
    if (!file) throw new ApiException(ApiCode.FileNotFound, '文件不存在');

    await this.prisma.file.delete({ where: { id: file.id } });
    await this.s3.delete(key).catch((err) => {
      this.logger.warn(`S3 文件删除失败（DB 记录已删，待清理）: ${key}`, err);
    });
  }

  async presign(key: string) {
    const file = await this.prisma.file.findUnique({
      where: { objectKey: key },
      select: { originalName: true, mimeType: true },
    });
    if (!file) throw new ApiException(ApiCode.FileNotFound, '文件不存在');

    const url = await this.s3.presignGet(key);
    return {
      name: file.originalName,
      mimeType: file.mimeType,
      url,
    };
  }

  async presignById(id: bigint) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      select: { objectKey: true, originalName: true, mimeType: true },
    });
    if (!file) throw new ApiException(ApiCode.FileNotFound, '文件不存在');

    const url = await this.s3.presignGet(file.objectKey);
    return {
      name: file.originalName,
      mimeType: file.mimeType,
      url,
    };
  }
}
