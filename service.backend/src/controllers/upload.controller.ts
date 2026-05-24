import { Response } from 'express';
import { FileUploadService, sanitizeDisplayFilename } from '../services/file-upload.service';
import { ApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/api';
import { logger } from '../utils/logger';

/**
 * ADS-588: staged image upload controller.
 *
 * Sits behind `petImageUpload.single('image')` + `enforceUploadMime`, so by the
 * time the handler runs multer has written the file to disk and the magic-byte
 * guard has confirmed the content matches the declared MIME. The controller's
 * remaining job is to:
 *   1. confirm a file is present,
 *   2. hand it to FileUploadService.uploadFile (which resizes + thumbnails
 *      per ADS-518 and records a FileUpload row),
 *   3. return the public URL pair the client embeds in a follow-up
 *      create-pet payload.
 */
export class UploadController {
  static async uploadImage(req: AuthenticatedRequest, res: Response): Promise<Response> {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user!.userId;

    try {
      const result = await FileUploadService.uploadFile(req.file, 'pets', {
        uploadedBy: userId,
        purpose: 'staged-image',
      });

      if (!result.success || !result.upload) {
        logger.error('Staged image upload failed: service returned no upload record');
        return res.status(500).json({ error: 'Failed to store uploaded file' });
      }

      const { upload } = result;
      // Return a sanitised display filename rather than the raw
      // original_filename. The staged image flow's response payload is
      // echoed by the client into downstream contexts (chat messages, pet
      // listings) visible to other users, so an adopter uploading
      // `Jane_Doe_Passport_123456789.pdf` would otherwise leak PII to
      // every viewer. The DB retains the original_filename for the
      // uploader's own UI and support tooling.
      return res.status(200).json({
        url: upload.url,
        thumbnail_url: upload.thumbnail_url ?? upload.url,
        original_filename: sanitizeDisplayFilename(upload.original_filename),
        size_bytes: upload.file_size,
        content_type: upload.mime_type,
      });
    } catch (error) {
      logger.error('Staged image upload failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
