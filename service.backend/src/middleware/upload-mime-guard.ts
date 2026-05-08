/**
 * ADS-437: server-side magic-byte MIME sniff on uploaded files.
 *
 * Multer's fileFilter only checks the client-supplied Content-Type header,
 * which is trivially spoofed. Once multer has written the file to disk we
 * sniff the actual magic bytes via `file-type` and reject + delete on any
 * mismatch BEFORE the controller sees the file. This guarantees no upload
 * route can rely on the spoofable header alone.
 *
 * Mount AFTER the multer middleware on each upload route:
 *   router.post('/upload', auth, multerInstance.single('file'), enforceUploadMime, ctrl);
 */
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import { fileTypeFromFile } from '../utils/file-type-wrapper';
import { config } from '../config';
import { logger } from '../utils/logger';

// Text-based formats have no reliable magic bytes; allow them through with
// the declared mimetype as long as it's on the allowlist.
const TEXT_BASED_MIMES = new Set(['text/plain', 'text/csv']);

// CodeQL js/path-injection: `filePath` comes from `req.files[].path` which
// multer wrote to disk under the configured uploads directory. Re-validate
// here so the unlink can never escape that root, even if a future regression
// in multer's filename sanitiser allowed a traversal payload through.
const removeFile = async (filePath: string): Promise<void> => {
  try {
    const uploadsRoot = path.resolve(config.storage.local.directory);
    const resolved = path.resolve(filePath);
    const relative = path.relative(uploadsRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return;
    }
    await fs.promises.unlink(resolved);
  } catch {
    /* best-effort cleanup */
  }
};

const checkOne = async (file: Express.Multer.File): Promise<string | undefined> => {
  if (TEXT_BASED_MIMES.has(file.mimetype)) {
    return undefined;
  }
  const sniffed = await fileTypeFromFile(file.path);
  if (!sniffed) {
    return `Could not determine file type for ${file.originalname}`;
  }
  if (sniffed.mime !== file.mimetype) {
    return `File ${file.originalname} declares ${file.mimetype} but content is ${sniffed.mime}`;
  }
  return undefined;
};

const collectFiles = (req: Request): Express.Multer.File[] => {
  if (req.file) {
    return [req.file];
  }
  if (Array.isArray(req.files)) {
    return req.files;
  }
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat();
  }
  return [];
};

/**
 * Express middleware. Sniffs magic bytes of every multer-attached file and
 * deletes + rejects on any mismatch. No-op when no files are attached.
 */
export const enforceUploadMime = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const files = collectFiles(req);
  if (files.length === 0) {
    next();
    return;
  }

  const failures: string[] = [];
  for (const file of files) {
    const error = await checkOne(file);
    if (error) {
      failures.push(error);
    }
  }

  if (failures.length === 0) {
    next();
    return;
  }

  // Delete every uploaded file in this request — partial uploads are not
  // safe to keep around once any one of them has failed validation.
  await Promise.all(files.map(f => removeFile(f.path)));

  logger.warn('Upload rejected: MIME sniff mismatch', { failures });
  res.status(400).json({
    error: 'Uploaded file content does not match declared type',
    details: failures,
  });
};
