import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AuthenticatedRequest } from '../types/api';
import { JsonObject } from '../types/common';
import { logger } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

// File upload configuration
const UPLOAD_CONFIG = {
  maxFileSize: config.uploads.maxSize,
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
  const dirPath = path.join(config.uploads.directory, dir);
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
      const uploadPath = path.join(config.uploads.directory, UPLOAD_CONFIG.directories[uploadType]);
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
      const filePath = path.join(config.uploads.directory, uploadRecord.file_path);
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

    // Additional security checks could be added here
    // - Virus scanning
    // - Content validation
    // - File header validation
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
    return `/api/v1/uploads/${filename}`;
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
    // Implementation for creating database record
    // This would use your existing models
    return {
      upload_id: uuidv4(),
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
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Get upload record from database
   */
  private static async getUploadRecord(uploadId: string): Promise<FileUploadRecord | null> {
    // Implementation for getting database record
    return null;
  }

  /**
   * Delete upload record from database
   */
  private static async deleteUploadRecord(uploadId: string): Promise<void> {
    // Implementation for deleting database record
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
