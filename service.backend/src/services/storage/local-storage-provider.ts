import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { generateCryptoUuid as uuidv4 } from '../../utils/uuid-helpers';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class LocalStorageProvider {
  private uploadDir: string;
  private publicPath: string;

  constructor() {
    this.uploadDir = path.resolve(config.storage.local.directory);
    this.publicPath = config.storage.local.publicPath;
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.ensureDir(this.uploadDir);
      await fs.ensureDir(path.join(this.uploadDir, 'pets'));
      await fs.ensureDir(path.join(this.uploadDir, 'users'));
      await fs.ensureDir(path.join(this.uploadDir, 'documents'));
      await fs.ensureDir(path.join(this.uploadDir, 'temp'));

      logger.info(`Local storage directory ensured: ${this.uploadDir}`);
    } catch (error) {
      logger.error('Failed to create upload directories:', error);
      throw error;
    }
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    contentType: string,
    category: 'pets' | 'users' | 'documents' = 'documents'
  ): Promise<{ url: string; filename: string; size: number }> {
    try {
      const fileExtension = path.extname(originalName);
      const filename = `${uuidv4()}${fileExtension}`;
      const relativePath = path.join(category, filename);
      const fullPath = path.join(this.uploadDir, relativePath);

      let processedBuffer = file;

      // Process images
      if (contentType.startsWith('image/')) {
        processedBuffer = await this.processImage(file, contentType);
      }

      await fs.writeFile(fullPath, processedBuffer);

      const url = `${this.publicPath}/${relativePath.replace(/\\/g, '/')}`;

      logger.info(`File uploaded locally: ${filename}`, {
        originalName,
        size: processedBuffer.length,
        category,
        url,
      });

      return {
        url,
        filename,
        size: processedBuffer.length,
      };
    } catch (error) {
      logger.error('Failed to upload file to local storage:', error);
      throw error;
    }
  }

  private async processImage(buffer: Buffer, contentType: string): Promise<Buffer> {
    try {
      const image = sharp(buffer);
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

      // Convert to JPEG for consistency and smaller size
      if (contentType !== 'image/jpeg') {
        return await image.jpeg({ quality: 90 }).toBuffer();
      }

      return buffer;
    } catch (error) {
      logger.warn('Image processing failed, using original:', error);
      return buffer;
    }
  }

  async deleteFile(filename: string, category: string = 'documents'): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, category, filename);
      await fs.remove(filePath);
      logger.info(`File deleted: ${filename}`);
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  async getFileInfo(filename: string, category: string = 'documents') {
    try {
      const filePath = path.join(this.uploadDir, category, filename);
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      return { exists: false };
    }
  }
}
