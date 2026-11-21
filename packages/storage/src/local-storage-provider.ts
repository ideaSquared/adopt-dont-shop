import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import sharp from 'sharp';
import {
  assertSafePathSegment,
  type FileInfo,
  type StorageCategory,
  type StorageProvider,
  type UploadResult,
} from './base-provider.js';
import { type LocalStorageConfig, type StorageLogger, resolveLogger } from './config.js';

// Cap decoded pixels so a small-on-disk image declaring extreme header
// dimensions (e.g. 100000x100000) can't make sharp allocate
// width*height*channels bytes and OOM the process. Hard-coded here to keep the
// package free of monolith config coupling.
const MAX_IMAGE_PIXELS = 100_000_000;

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;
  private readonly publicPath: string;
  private readonly logger: Required<StorageLogger>;

  constructor(localConfig: LocalStorageConfig, logger?: StorageLogger) {
    this.uploadDir = path.resolve(localConfig.directory);
    this.publicPath = localConfig.publicPath;
    this.logger = resolveLogger(logger);
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    contentType: string,
    category: StorageCategory = 'documents'
  ): Promise<UploadResult> {
    // Guard BEFORE the try so traversal can't be masked by the catch.
    assertSafePathSegment(category, 'category');
    try {
      const fileExtension = path.extname(originalName);
      const filename = `${randomUUID()}${fileExtension}`;
      const relativePath = path.join(category, filename);
      const fullPath = path.join(this.uploadDir, relativePath);

      // Ensure the category directory exists before writing. The constructor
      // also seeds the standard subdirs, but that runs asynchronously, so this
      // removes any ordering dependency on it.
      await fs.ensureDir(path.dirname(fullPath));

      let processedBuffer = file;

      // Process images only — non-image content (e.g. application/pdf) passes
      // through untouched.
      if (contentType.startsWith('image/')) {
        processedBuffer = await this.processImage(file);
      }

      await fs.writeFile(fullPath, processedBuffer);

      const url = `${this.publicPath}/${relativePath.replace(/\\/g, '/')}`;

      this.logger.info('file uploaded locally', {
        key: relativePath,
        size: processedBuffer.length,
        category,
      });

      return {
        url,
        filename,
        size: processedBuffer.length,
      };
    } catch (error) {
      this.logger.error('failed to upload file to local storage', { category }, error);
      throw error;
    }
  }

  // Fails closed: an image sharp cannot process is rejected, never stored as-is.
  private async processImage(buffer: Buffer): Promise<Buffer> {
    // rotate() with no arguments auto-orients from EXIF, so portrait phone photos
    // stay upright once the orientation tag is stripped on output.
    const image = sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS }).rotate();
    const metadata = await image.metadata();

    // Resize if too large (max 1920x1080)
    if (metadata.width && metadata.width > 1920) {
      return await image
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    }

    // Always re-encode (JPEG stays JPEG): metadata() only parses the header, so
    // returning the original bytes would keep EXIF/GPS data and accept corrupt
    // pixel data. sharp drops metadata on output by default.
    return await image.jpeg({ quality: 90 }).toBuffer();
  }

  async deleteFile(filename: string, category: string = 'documents'): Promise<void> {
    // Guard BEFORE the try so traversal can't be masked by the catch.
    assertSafePathSegment(category, 'category');
    assertSafePathSegment(filename, 'filename');
    try {
      const filePath = path.join(this.uploadDir, category, filename);
      await fs.remove(filePath);
      this.logger.info('file deleted locally', { key: `${category}/${filename}` });
    } catch (error) {
      this.logger.error('failed to delete local file', { key: `${category}/${filename}` }, error);
      throw error;
    }
  }

  async getFileInfo(filename: string, category: string = 'documents'): Promise<FileInfo> {
    // Guard BEFORE the try — getFileInfo's catch maps errors to {exists:false},
    // which would otherwise silently swallow a traversal attempt.
    assertSafePathSegment(category, 'category');
    assertSafePathSegment(filename, 'filename');
    try {
      const filePath = path.join(this.uploadDir, category, filename);
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch {
      return { exists: false };
    }
  }

  getName(): string {
    return 'local';
  }

  validateConfiguration(): boolean {
    return Boolean(this.uploadDir);
  }

  supportsSignedUrls(): boolean {
    return false;
  }

  async getSignedUrl(): Promise<string> {
    throw new Error('Local storage provider does not generate signed URLs');
  }
}
