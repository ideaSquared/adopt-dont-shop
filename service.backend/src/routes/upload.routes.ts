/**
 * ADS-588: staged image upload route.
 *
 * `POST /api/v1/uploads/images` accepts a single image file
 * (multipart/form-data, field `image`) and returns the public URL +
 * thumbnail URL the client embeds in a follow-up create-pet payload.
 *
 * Mounted under `/api/v1/uploads`. The sibling `/api/v1/uploads/authorize`
 * route in upload-serve.routes.ts handles nginx auth_request subrequests
 * and is not affected by this router because they use different HTTP
 * methods.
 */
import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rate-limiter';
import { enforceUploadMime } from '../middleware/upload-mime-guard';
import { petImageUpload } from '../services/file-upload.service';
import type { AuthenticatedRequest } from '../types/api';

const router = Router();

/**
 * Translate multer's `LIMIT_FILE_SIZE` to 413 and any other multer /
 * fileFilter rejection to 400. Without this wrapper, multer errors fall
 * through to the generic Express error handler, which returns 500 with
 * the raw error message.
 */
const handleMulterErrors = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof Error) {
    // fileFilter rejections surface here as plain Errors.
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
};

router.post(
  '/images',
  uploadLimiter,
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    petImageUpload.single('image')(req, res, err => handleMulterErrors(err, req, res, next)),
  enforceUploadMime,
  UploadController.uploadImage
);

export default router;
