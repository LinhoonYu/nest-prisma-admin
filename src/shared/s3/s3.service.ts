import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

import { IStorageConfig, StorageConfig } from '~/config';
import { AppLogger } from '~/common/logger/app-logger';

@Injectable()
export class S3Service implements OnModuleInit {
  private client!: S3Client;

  constructor(
    @Inject(StorageConfig.KEY) private config: IStorageConfig,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(S3Service.name);
  }

  async onModuleInit() {
    this.client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKey,
        secretAccessKey: this.config.secretKey,
      },
      forcePathStyle: true,
    });

    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.config.bucket }),
      );
      this.logger.info(
        `S3 连接正常: ${this.config.endpoint}/${this.config.bucket}`,
      );
    } catch (err) {
      this.logger.warn(
        `S3 连接失败，文件上传功能不可用: ${this.config.endpoint}/${this.config.bucket} — ${(err as Error).message}`,
      );
    }
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  async presignGet(key: string, expiry?: number): Promise<string> {
    const expiresIn = expiry ?? this.config.presignExpiry;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
      { expiresIn },
    );
  }

  async getObjectStream(
    key: string,
  ): Promise<{ stream: Readable; mimeType: string }> {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
    const body = res.Body;
    if (!body || !(body instanceof Readable)) {
      throw new Error('S3 返回的文件流不可用');
    }
    return {
      stream: body,
      mimeType: res.ContentType || 'application/octet-stream',
    };
  }
}
