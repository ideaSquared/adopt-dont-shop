import { logger } from '../../utils/logger';
import { FileInfo, StorageCategory, StorageProvider, UploadResult } from './base-provider';

export type S3Config = {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  cloudFrontDomain?: string;
};

/**
 * S3 storage provider scaffold. Vendor wiring deferred — install
 * `@aws-sdk/client-s3` and implement upload/delete/getFileInfo when the
 * production deploy is ready.
 *
 * `validateConfiguration` returns true only when all required creds are
 * present so startup can fail fast in production.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly config: S3Config;

  constructor(s3Config: S3Config) {
    this.config = s3Config;
  }

  async uploadFile(
    _file: Buffer,
    _originalName: string,
    _contentType: string,
    _category: StorageCategory = 'documents'
  ): Promise<UploadResult> {
    logger.error('S3StorageProvider.uploadFile invoked but not implemented');
    throw new Error('S3 storage provider not implemented — vendor wiring required');
  }

  async deleteFile(_filename: string, _category: string = 'documents'): Promise<void> {
    logger.error('S3StorageProvider.deleteFile invoked but not implemented');
    throw new Error('S3 storage provider not implemented — vendor wiring required');
  }

  async getFileInfo(_filename: string, _category: string = 'documents'): Promise<FileInfo> {
    logger.error('S3StorageProvider.getFileInfo invoked but not implemented');
    throw new Error('S3 storage provider not implemented — vendor wiring required');
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
}
