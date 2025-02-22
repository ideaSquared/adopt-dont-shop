import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { MessageAttachment } from '../Models/Message'
import { AuditLogger } from './auditLogService'

const UPLOAD_DIR = path.join(__dirname, '../../uploads/chat-attachments')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4()
    const extension = path.extname(file.originalname)
    cb(null, `${uniqueId}${extension}`)
  },
})

// File filter function
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Allowed file types
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type'))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
})

export class FileUploadService {
  static async uploadFile(
    file: Express.Multer.File,
  ): Promise<MessageAttachment> {
    return this.saveFile(file)
  }

  private static getFileUrl(filename: string): string {
    return `/api/uploads/chat-attachments/${filename}`
  }

  public static async saveFile(
    file: Express.Multer.File,
  ): Promise<MessageAttachment> {
    try {
      const attachment: MessageAttachment = {
        attachment_id: uuidv4(),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: this.getFileUrl(file.filename),
      }

      AuditLogger.logAction(
        'FileUpload',
        `File uploaded successfully: ${file.filename}`,
        'INFO',
      )

      return attachment
    } catch (error) {
      AuditLogger.logAction(
        'FileUpload',
        `File upload failed: ${(error as Error).message}`,
        'ERROR',
      )
      throw error
    }
  }

  public static async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(UPLOAD_DIR, filename)
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        AuditLogger.logAction(
          'FileUpload',
          `File deleted successfully: ${filename}`,
          'INFO',
        )
      }
    } catch (error) {
      AuditLogger.logAction(
        'FileUpload',
        `File deletion failed: ${(error as Error).message}`,
        'ERROR',
      )
      throw error
    }
  }

  public static validateFileSize(size: number): boolean {
    return size <= MAX_FILE_SIZE
  }

  public static async cleanupOrphanedFiles(): Promise<void> {
    try {
      // Implementation for cleaning up files not referenced in messages
      // This would be run periodically
    } catch (error) {
      AuditLogger.logAction(
        'FileUpload',
        `Cleanup failed: ${(error as Error).message}`,
        'ERROR',
      )
    }
  }
}
