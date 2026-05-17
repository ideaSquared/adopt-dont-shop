import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import path from 'path';
import { generateCryptoUuid as uuidv4 } from '../../utils/uuid-helpers';
import { logger } from '../../utils/logger';
import { FileInfo, StorageCategory, StorageProvider, UploadResult } from './base-provider';

export type S3Config = {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  cloudFrontDomain?: string;
};

export class S3StorageProvider implements StorageProvider {
  private readonly config: S3Config;
  private readonly client: S3Client;

  constructor(s3Config: S3Config, client?: S3Client) {
    this.config = s3Config;
    this.client =
      client ??
      new S3Client({
        region: s3Config.region ?? 'us-east-1',
        credentials:
          s3Config.accessKeyId && s3Config.secretAccessKey
            ? {
                accessKeyId: s3Config.accessKeyId,
                secretAccessKey: s3Config.secretAccessKey,
              }
            : undefined,
      });
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    contentType: string,
    category: StorageCategory = 'documents'
  ): Promise<UploadResult> {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const key = `${category}/${filename}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket!,
          Key: key,
          Body: file,
          ContentType: contentType,
        })
      );

      const url = this.buildUrl(key);

      logger.info('File uploaded to S3', { key, size: file.length, category, url });

      return { url, filename, size: file.length };
    } catch (error) {
      logger.error('Failed to upload file to S3:', error);
      throw error;
    }
  }

  async deleteFile(filename: string, category: string = 'documents'): Promise<void> {
    const key = `${category}/${filename}`;
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket!,
          Key: key,
        })
      );
      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('Failed to delete file from S3:', error);
      throw error;
    }
  }

  async getFileInfo(filename: string, category: string = 'documents'): Promise<FileInfo> {
    const key = `${category}/${filename}`;
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket!,
          Key: key,
        })
      );
      return {
        exists: true,
        size: response.ContentLength ?? 0,
        modified: response.LastModified ?? new Date(),
      };
    } catch {
      return { exists: false };
    }
  }

  getName(): string {
    return 's3';
  }

  validateConfiguration(): boolean {
    return Boolean(
      this.config.bucket &&
        this.config.region &&
        this.config.accessKeyId &&
        this.config.secretAccessKey
    );
  }

  private buildUrl(key: string): string {
    if (this.config.cloudFrontDomain) {
      return `https://${this.config.cloudFrontDomain}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}
