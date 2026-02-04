import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { generateCryptoUuid as uuidv4 } from '../utils/uuid-helpers';
import { config } from '../config';
import { AuthenticatedRequest } from '../types/api';
import { JsonObject } from '../types/common';
import { logger } from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import FileUpload from '../models/FileUpload';
import { fromFile as fileTypeFromFile } from 'file-type';
import DOMPurify from 'isomorphic-dompurify';

// File upload configuration
const UPLOAD_CONFIG = {
  maxFileSize: config.storage.local.maxFileSize,
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    videos: ['video/mp4', 'video/webm', 'video/ogg'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  },
  directories: {
    pets: 'pets',
    applications: 'applications',
    chat: 'chat',
    profiles: 'profiles',
    documents: 'documents',
    temp: 'temp',
  },
};

// Ensure upload directories exist
Object.values(UPLOAD_CONFIG.directories).forEach(dir => {
  const dirPath = path.join(config.storage.local.directory, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Enhanced file filter with better validation
const createFileFilter = (allowedTypes: string[] = []) => {
  return (req: AuthenticatedRequest, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allAllowedTypes = [
      ...UPLOAD_CONFIG.allowedMimeTypes.images,
      ...UPLOAD_CONFIG.allowedMimeTypes.documents,
      ...UPLOAD_CONFIG.allowedMimeTypes.videos,
      ...UPLOAD_CONFIG.allowedMimeTypes.audio,
      ...allowedTypes,
    ];

    if (allAllowedTypes.includes(file.mimetype)) {
      // Additional security checks
      const extension = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.svg',
        '.pdf',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.txt',
        '.csv',
        '.mp4',
        '.webm',
        '.ogg',
        '.mp3',
        '.wav',
      ];

      if (allowedExtensions.includes(extension)) {
        cb(null, true);
      } else {
        cb(new Error(`File extension ${extension} is not allowed`));
      }
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  };
};

// Enhanced storage configuration
const createStorage = (uploadType: keyof typeof UPLOAD_CONFIG.directories) => {
  return multer.diskStorage({
    destination: (
      req: AuthenticatedRequest,
      file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void
    ) => {
      const uploadPath = path.join(
        config.storage.local.directory,
        UPLOAD_CONFIG.directories[uploadType]
      );
      cb(null, uploadPath);
    },
    filename: (
      req: AuthenticatedRequest,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void
    ) => {
      const uniqueId = uuidv4();
      const extension = path.extname(file.originalname);
      const timestamp = Date.now();
      cb(null, `${uploadType}_${timestamp}_${uniqueId}${extension}`);
    },
  });
};

// Create multer instances for different upload types
export const createUploadMiddleware = (
  uploadType: keyof typeof UPLOAD_CONFIG.directories,
  options: {
    maxFiles?: number;
    allowedTypes?: string[];
    maxFileSize?: number;
  } = {}
) => {
  const { maxFiles = 10, allowedTypes = [], maxFileSize = UPLOAD_CONFIG.maxFileSize } = options;

  return multer({
    storage: createStorage(uploadType),
    fileFilter: createFileFilter(allowedTypes),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
    },
  });
};

// Pre-configured upload middlewares
export const petImageUpload = createUploadMiddleware('pets', {
  allowedTypes: UPLOAD_CONFIG.allowedMimeTypes.images,
  maxFiles: 10,
  maxFileSize: 10 * 1024 * 1024, // 10MB for images
});

export const applicationDocumentUpload = createUploadMiddleware('applications', {
  allowedTypes: UPLOAD_CONFIG.allowedMimeTypes.documents,
  maxFiles: 5,
  maxFileSize: 5 * 1024 * 1024, // 5MB for documents
});

export const chatAttachmentUpload = createUploadMiddleware('chat', {
  allowedTypes: [
    ...UPLOAD_CONFIG.allowedMimeTypes.images,
    ...UPLOAD_CONFIG.allowedMimeTypes.documents,
    ...UPLOAD_CONFIG.allowedMimeTypes.videos,
    ...UPLOAD_CONFIG.allowedMimeTypes.audio,
  ],
  maxFiles: 5,
  maxFileSize: 25 * 1024 * 1024, // 25MB for chat attachments
});

export const profileImageUpload = createUploadMiddleware('profiles', {
  allowedTypes: UPLOAD_CONFIG.allowedMimeTypes.images,
  maxFiles: 1,
  maxFileSize: 5 * 1024 * 1024, // 5MB for profile images
});

// Enhanced File Upload Service
export class FileUploadService {
  /**
   * Upload a single file with enhanced validation and processing
   */
  static async uploadFile(
    file: Express.Multer.File,
    uploadType: keyof typeof UPLOAD_CONFIG.directories,
    metadata: {
      uploadedBy: string;
      entityId?: string;
      entityType?: string;
      purpose?: string;
    }
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      await this.validateFile(file);

      // Process file (resize images, generate thumbnails, etc.)
      const processedFile = await this.processFile(file, uploadType);

      // Generate file metadata
      const fileMetadata = await this.generateFileMetadata(file, processedFile);

      // Create database record
      const uploadRecord = await this.createUploadRecord(fileMetadata, metadata);

      // Log the upload
      await AuditLogService.log({
        action: 'FILE_UPLOAD',
        entity: 'FILE',
        entityId: uploadRecord.upload_id,
        userId: metadata.uploadedBy,
        details: {
          filename: file.originalname,
          size: file.size,
          type: file.mimetype,
          uploadType,
          purpose: metadata.purpose || null,
        },
      });

      logger.info('File uploaded successfully', {
        uploadId: uploadRecord.upload_id,
        filename: file.originalname,
        size: file.size,
        type: file.mimetype,
      });

      return {
        success: true,
        upload: uploadRecord,
        file: fileMetadata,
      };
    } catch (error) {
      logger.error('File upload failed:', error);
      throw new Error(
        `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(
    files: Express.Multer.File[],
    uploadType: keyof typeof UPLOAD_CONFIG.directories,
    metadata: {
      uploadedBy: string;
      entityId?: string;
      entityType?: string;
      purpose?: string;
    }
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, uploadType, metadata);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          filename: file.originalname,
        });
      }
    }

    return results;
  }

  /**
   * Delete a file and its database record
   */
  static async deleteFile(
    uploadId: string,
    deletedBy: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get upload record
      const uploadRecord = await this.getUploadRecord(uploadId);
      if (!uploadRecord) {
        throw new Error('Upload record not found');
      }

      // Delete physical file
      const filePath = path.join(config.storage.local.directory, uploadRecord.file_path);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }

      // Delete database record
      await this.deleteUploadRecord(uploadId);

      // Log deletion
      await AuditLogService.log({
        action: 'FILE_DELETE',
        entity: 'FILE',
        entityId: uploadId,
        userId: deletedBy,
        details: {
          filename: uploadRecord.original_filename,
          reason: 'User requested deletion',
        },
      });

      logger.info('File deleted successfully', { uploadId, deletedBy });

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      logger.error('File deletion failed:', error);
      throw new Error(
        `File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get file information
   */
  static async getFileInfo(uploadId: string): Promise<FileUploadRecord | null> {
    try {
      return await this.getUploadRecord(uploadId);
    } catch (error) {
      logger.error('Failed to get file info:', error);
      return null;
    }
  }

  /**
   * Clean up orphaned files
   */
  static async cleanupOrphanedFiles(): Promise<{ deleted: number; errors: number }> {
    const deleted = 0;
    const errors = 0;

    try {
      // Implementation for cleaning up files not referenced in database
      // This would be run periodically via a cron job
      logger.info('Starting orphaned file cleanup');

      // Add cleanup logic here

      logger.info('Orphaned file cleanup completed', { deleted, errors });
      return { deleted, errors };
    } catch (error) {
      logger.error('Orphaned file cleanup failed:', error);
      return { deleted, errors };
    }
  }

  /**
   * Validate file before upload
   */
  private static async validateFile(file: Express.Multer.File): Promise<void> {
    // Check file size
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      throw new Error(
        `File size ${file.size} exceeds maximum allowed size ${UPLOAD_CONFIG.maxFileSize}`
      );
    }

    // Check file type
    const allAllowedTypes = [
      ...UPLOAD_CONFIG.allowedMimeTypes.images,
      ...UPLOAD_CONFIG.allowedMimeTypes.documents,
      ...UPLOAD_CONFIG.allowedMimeTypes.videos,
      ...UPLOAD_CONFIG.allowedMimeTypes.audio,
    ];

    if (!allAllowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    // Validate file content matches MIME type (magic byte checking)
    await this.validateFileContent(file);

    // Sanitize SVG files to prevent XSS
    if (file.mimetype === 'image/svg+xml') {
      await this.sanitizeSvgFile(file);
    }

    // Scan for malware
    const isSafe = await this.scanForMalware(file.path);
    if (!isSafe) {
      // Delete the potentially malicious file
      await fs.promises.unlink(file.path);
      throw new Error('File failed malware scan and has been removed');
    }
  }

  /**
   * Validate file content matches declared MIME type using magic byte checking
   */
  private static async validateFileContent(file: Express.Multer.File): Promise<void> {
    try {
      const fileTypeResult = await fileTypeFromFile(file.path);

      // If we can't determine the file type, reject it for security
      if (!fileTypeResult) {
        // Allow certain text-based files that don't have magic bytes
        const textBasedMimeTypes = ['text/plain', 'text/csv'];
        if (!textBasedMimeTypes.includes(file.mimetype)) {
          throw new Error('Unable to determine file type - file may be corrupted or invalid');
        }
        // For text files, we allow them but log for monitoring
        logger.warn('Text file without magic bytes uploaded', {
          filename: file.originalname,
          mimeType: file.mimetype,
        });
        return;
      }

      // Check if detected MIME type matches declared MIME type
      if (fileTypeResult.mime !== file.mimetype) {
        throw new Error(
          `File type mismatch - declared: ${file.mimetype}, detected: ${fileTypeResult.mime}. Possible MIME type spoofing attack.`
        );
      }

      logger.info('File content validation passed', {
        filename: file.originalname,
        mimeType: file.mimetype,
        detectedType: fileTypeResult.mime,
      });
    } catch (error) {
      logger.error('File content validation failed:', error);
      throw error;
    }
  }

  /**
   * Sanitize SVG files to prevent XSS attacks
   */
  private static async sanitizeSvgFile(file: Express.Multer.File): Promise<void> {
    try {
      // Read the SVG file content
      const svgContent = await fs.promises.readFile(file.path, 'utf-8');

      // Sanitize the SVG content using DOMPurify
      // isomorphic-dompurify works in Node.js environment automatically
      const cleanSvg = DOMPurify.sanitize(svgContent, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
        FORBID_ATTR: [
          'onerror',
          'onload',
          'onclick',
          'onmouseover',
          'onmouseout',
          'onmousemove',
          'onmouseenter',
          'onmouseleave',
          'onfocus',
          'onblur',
          'onchange',
          'oninput',
        ],
        ADD_ATTR: ['xmlns'],
      });

      // If sanitization removed content, the file is suspicious
      if (!cleanSvg || cleanSvg.length === 0) {
        throw new Error('SVG sanitization removed all content - file may contain malicious code');
      }

      // Write the sanitized content back to the file
      await fs.promises.writeFile(file.path, cleanSvg, 'utf-8');

      logger.info('SVG file sanitized successfully', {
        filename: file.originalname,
        originalSize: svgContent.length,
        sanitizedSize: cleanSvg.length,
      });
    } catch (error) {
      logger.error('SVG sanitization failed:', error);
      throw new Error(
        `SVG sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Scan file for malware
   *
   * TODO: Integrate with antivirus solution
   * Options:
   * 1. ClamAV (open-source, self-hosted)
   *    - Install: apt-get install clamav clamav-daemon
   *    - Node package: clamscan
   *    - Usage: const ClamScan = require('clamscan'); const clamscan = await new ClamScan().init();
   *
   * 2. VirusTotal API (cloud-based)
   *    - Requires API key from virustotal.com
   *    - Node package: virustotal-api or node-virustotal
   *    - Rate limits apply (free tier: 4 requests/minute)
   *
   * 3. AWS GuardDuty for S3 (when migrating to S3)
   *    - Automatic malware detection for S3 uploads
   *    - Integrates with AWS Security Hub
   *
   * Implementation checklist:
   * - [ ] Choose antivirus solution based on infrastructure
   * - [ ] Install and configure antivirus service
   * - [ ] Install appropriate Node.js package
   * - [ ] Update this method with actual scanning logic
   * - [ ] Add error handling for scan failures
   * - [ ] Implement quarantine process for infected files
   * - [ ] Add monitoring and alerting for malware detections
   * - [ ] Document scanning configuration in deployment docs
   */
  private static async scanForMalware(filePath: string): Promise<boolean> {
    // TODO: Implement actual malware scanning
    // For now, return true (safe) but log that scanning is not implemented
    logger.warn('Malware scanning not yet implemented - file accepted without scan', {
      filePath,
    });

    // Example ClamAV integration (commented out until implemented):
    /*
    try {
      const ClamScan = require('clamscan');
      const clamscan = await new ClamScan().init({
        clamdscan: {
          socket: '/var/run/clamav/clamd.ctl',
          timeout: 60000,
        },
      });

      const { isInfected, viruses } = await clamscan.isInfected(filePath);

      if (isInfected) {
        logger.error('Malware detected in file', { filePath, viruses });
        return false;
      }

      logger.info('File passed malware scan', { filePath });
      return true;
    } catch (error) {
      logger.error('Malware scan failed:', error);
      // Fail-safe: reject file if scan fails
      return false;
    }
    */

    return true; // Placeholder - returns safe by default
  }

  /**
   * Process file after upload (resize images, generate thumbnails, etc.)
   */
  private static async processFile(
    file: Express.Multer.File,
    uploadType: keyof typeof UPLOAD_CONFIG.directories
  ): Promise<ProcessedFileInfo> {
    const processedInfo: ProcessedFileInfo = {
      originalPath: file.path,
      processedPath: file.path,
      thumbnailPath: undefined,
      metadata: {},
    };

    // Process images
    if (UPLOAD_CONFIG.allowedMimeTypes.images.includes(file.mimetype)) {
      // Add image processing logic here (resize, compress, generate thumbnails)
      // This would use a library like sharp or jimp
    }

    // Process videos
    if (UPLOAD_CONFIG.allowedMimeTypes.videos.includes(file.mimetype)) {
      // Add video processing logic here (generate thumbnails, extract metadata)
    }

    return processedInfo;
  }

  /**
   * Generate file metadata
   */
  private static async generateFileMetadata(
    file: Express.Multer.File,
    processedFile: ProcessedFileInfo
  ): Promise<FileMetadata> {
    const stats = await fs.promises.stat(file.path);

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      url: this.generateFileUrl(file.filename),
      thumbnailUrl: processedFile.thumbnailPath
        ? this.generateFileUrl(path.basename(processedFile.thumbnailPath))
        : undefined,
      metadata: {
        ...processedFile.metadata,
        uploadedAt: new Date().toISOString(),
        lastModified: stats.mtime.toISOString(),
        checksum: await this.generateChecksum(file.path),
      },
    };
  }

  /**
   * Generate file URL
   */
  private static generateFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  /**
   * Generate file checksum
   */
  private static async generateChecksum(filePath: string): Promise<string> {
    try {
      const crypto = await import('crypto');
      const fs = await import('fs');

      const fileBuffer = await fs.promises.readFile(filePath);
      const hash = crypto.createHash('md5');
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      logger.error('Error generating file checksum:', error);
      return 'unknown';
    }
  }

  /**
   * Create upload record in database
   */
  private static async createUploadRecord(
    fileMetadata: FileMetadata,
    metadata: {
      uploadedBy: string;
      entityId?: string;
      entityType?: string;
      purpose?: string;
    }
  ): Promise<FileUploadRecord> {
    try {
      const upload = await FileUpload.create({
        original_filename: fileMetadata.originalName,
        stored_filename: fileMetadata.filename,
        file_path: fileMetadata.path,
        mime_type: fileMetadata.mimeType,
        file_size: fileMetadata.size,
        url: fileMetadata.url,
        thumbnail_url: fileMetadata.thumbnailUrl,
        uploaded_by: metadata.uploadedBy,
        entity_id: metadata.entityId,
        entity_type: metadata.entityType,
        purpose: metadata.purpose,
        metadata: fileMetadata.metadata,
      });

      return {
        upload_id: upload.upload_id,
        original_filename: upload.original_filename,
        stored_filename: upload.stored_filename,
        file_path: upload.file_path,
        mime_type: upload.mime_type,
        file_size: upload.file_size,
        url: upload.url,
        thumbnail_url: upload.thumbnail_url,
        uploaded_by: upload.uploaded_by,
        entity_id: upload.entity_id,
        entity_type: upload.entity_type,
        purpose: upload.purpose,
        metadata: upload.metadata as FileUploadMetadata,
        created_at: upload.created_at,
        updated_at: upload.updated_at,
      };
    } catch (error) {
      logger.error('Failed to create upload record:', error);
      throw new Error(
        `Failed to create upload record: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get upload record from database
   */
  private static async getUploadRecord(uploadId: string): Promise<FileUploadRecord | null> {
    try {
      const upload = await FileUpload.findByPk(uploadId);
      if (!upload) {
        return null;
      }

      return {
        upload_id: upload.upload_id,
        original_filename: upload.original_filename,
        stored_filename: upload.stored_filename,
        file_path: upload.file_path,
        mime_type: upload.mime_type,
        file_size: upload.file_size,
        url: upload.url,
        thumbnail_url: upload.thumbnail_url,
        uploaded_by: upload.uploaded_by,
        entity_id: upload.entity_id,
        entity_type: upload.entity_type,
        purpose: upload.purpose,
        metadata: upload.metadata as FileUploadMetadata,
        created_at: upload.created_at,
        updated_at: upload.updated_at,
      };
    } catch (error) {
      logger.error('Failed to get upload record:', error);
      throw new Error(
        `Failed to get upload record: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete upload record from database
   */
  private static async deleteUploadRecord(uploadId: string): Promise<void> {
    try {
      const upload = await FileUpload.findByPk(uploadId);
      if (upload) {
        await upload.destroy();
        logger.info('Upload record deleted from database', { uploadId });
      }
    } catch (error) {
      logger.error('Failed to delete upload record:', error);
      throw new Error(
        `Failed to delete upload record: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// File Upload Metadata Types
export interface FileUploadMetadata {
  uploadedAt: string; // ISO date string for JSON compatibility
  lastModified: string; // ISO date string for JSON compatibility
  checksum: string;
  // Allow for additional metadata fields while maintaining type safety
  [key: string]: string | number | boolean | null | JsonObject;
}

export interface ProcessedFileMetadata {
  processedAt?: string; // ISO date string for JSON compatibility
  compressionRatio?: number;
  thumbnailGenerated?: boolean;
  dimensions?: {
    width: number;
    height: number;
  };
  // Allow for additional processed metadata fields
  [key: string]: string | number | boolean | null | JsonObject | undefined;
}

// Types
export interface FileUploadResult {
  success: boolean;
  upload?: FileUploadRecord;
  file?: FileMetadata;
  error?: string;
  filename?: string;
}

export interface FileUploadRecord {
  upload_id: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  url: string;
  thumbnail_url?: string;
  uploaded_by: string;
  entity_id?: string;
  entity_type?: string;
  purpose?: string;
  metadata: FileUploadMetadata;
  created_at: Date;
  updated_at: Date;
}

export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  thumbnailUrl?: string;
  metadata: FileUploadMetadata;
}

export interface ProcessedFileInfo {
  originalPath: string;
  processedPath: string;
  thumbnailPath?: string;
  metadata: ProcessedFileMetadata;
}
