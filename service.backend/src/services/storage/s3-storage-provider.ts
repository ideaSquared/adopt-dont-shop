import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

type ValidatedS3Config = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  cloudFrontDomain?: string;
};

const DEFAULT_SIGNED_URL_TTL_SECONDS = 5 * 60;

const IMAGE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const isInlineSafeContentType = (contentType: string): boolean =>
  IMAGE_CONTENT_TYPES.has(contentType);

export class S3StorageProvider implements StorageProvider {
  private readonly config: S3Config;
  private readonly validated: ValidatedS3Config | null;
  private readonly client: S3Client;

  constructor(s3Config: S3Config, client?: S3Client) {
    this.config = s3Config;
    this.validated = S3StorageProvider.validate(s3Config);
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

  private static validate(s3Config: S3Config): ValidatedS3Config | null {
    if (
      !s3Config.bucket ||
      !s3Config.region ||
      !s3Config.accessKeyId ||
      !s3Config.secretAccessKey
    ) {
      return null;
    }
    return {
      bucket: s3Config.bucket,
      region: s3Config.region,
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      cloudFrontDomain: s3Config.cloudFrontDomain,
    };
  }

  private requireConfig(): ValidatedS3Config {
    if (!this.validated) {
      throw new Error(
        'S3 storage provider misconfigured: S3_BUCKET_NAME, S3_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required'
      );
    }
    return this.validated;
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    contentType: string,
    category: StorageCategory = 'documents'
  ): Promise<UploadResult> {
    const { bucket } = this.requireConfig();
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const key = `${category}/${filename}`;

    // Non-image uploads land with Content-Disposition: attachment so a browser
    // never renders an HTML/PDF polyglot inline from the CDN origin. Images use
    // their content-type as declared so they can be embedded with <img>.
    const contentDisposition = isInlineSafeContentType(contentType) ? undefined : 'attachment';

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file,
          ContentType: contentType,
          // Defence-in-depth: enforce SSE-S3 even if the bucket default is misconfigured.
          ServerSideEncryption: 'AES256',
          ...(contentDisposition ? { ContentDisposition: contentDisposition } : {}),
        })
      );

      const url = this.buildUrl(key);

      // Do not log `url` — for private categories the URL is a credential-equivalent
      // identifier. Key + size are enough for ops correlation.
      logger.info('File uploaded to S3', { key, size: file.length, category });

      return { url, filename, size: file.length };
    } catch (error) {
      logger.error('Failed to upload file to S3:', error);
      throw error;
    }
  }

  async deleteFile(filename: string, category: string = 'documents'): Promise<void> {
    const { bucket } = this.requireConfig();
    const key = `${category}/${filename}`;
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
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
    const { bucket } = this.requireConfig();
    const key = `${category}/${filename}`;
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return {
        exists: true,
        size: response.ContentLength ?? 0,
        modified: response.LastModified ?? new Date(),
      };
    } catch (error) {
      // Only "not found" maps to exists:false. AccessDenied, throttling, network
      // errors must surface so callers don't make decisions on a misleading
      // "doesn't exist" answer (e.g. orphan-cleanup deciding the DB row is stale).
      if (S3StorageProvider.isNotFoundError(error)) {
        return { exists: false };
      }
      logger.error('S3 HeadObject failed:', error);
      throw error;
    }
  }

  private static isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const candidate = error as {
      name?: unknown;
      Code?: unknown;
      $metadata?: { httpStatusCode?: unknown };
    };
    if (candidate.name === 'NotFound' || candidate.name === 'NoSuchKey') {
      return true;
    }
    if (candidate.Code === 'NotFound' || candidate.Code === 'NoSuchKey') {
      return true;
    }
    return candidate.$metadata?.httpStatusCode === 404;
  }

  getName(): string {
    return 's3';
  }

  validateConfiguration(): boolean {
    return this.validated !== null;
  }

  supportsSignedUrls(): boolean {
    return true;
  }

  async getSignedUrl(
    filename: string,
    category: string = 'documents',
    expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
  ): Promise<string> {
    const { bucket } = this.requireConfig();
    const key = `${category}/${filename}`;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  private buildUrl(key: string): string {
    // Stored on the upload row for backwards compatibility with existing callers
    // that read `file_uploads.url` directly. Private content is *not* served
    // from this URL — the FileUploadService rewrites the URL for private
    // categories to route through the auth-gated /uploads/* serve route.
    if (this.config.cloudFrontDomain) {
      return `https://${this.config.cloudFrontDomain}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}
