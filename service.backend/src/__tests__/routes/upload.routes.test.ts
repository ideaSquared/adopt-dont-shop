/**
 * ADS-588: POST /api/v1/uploads/images — staged image upload endpoint.
 *
 * The endpoint accepts a single image file (multipart/form-data, field
 * name `image`) and returns the public URL + thumbnail URL pair that
 * clients embed in a subsequent create-pet payload's `images: string[]`.
 *
 * These tests cover the contract the ticket spells out:
 *   - 200 happy path with the documented response shape
 *   - 401 when unauthenticated
 *   - 400 when the multer fileFilter rejects a disallowed MIME
 *   - 413 when multer reports LIMIT_FILE_SIZE
 *   - 400 when the magic-byte guard reports a mismatch
 */

import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import multer from 'multer';
import request from 'supertest';
import type { AuthenticatedRequest } from '../../types';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn() },
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  uploadLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

// Stub petImageUpload with a deterministic in-memory multer. The default
// limit is 10 MB and the fileFilter mirrors the production allowlist (image
// MIME types only). Individual tests override behaviour by re-mocking
// before importing the router (see helper buildAppWithMulter).
const petImageUploadMock = {
  single: vi.fn(),
};
const fileUploadServiceMock = {
  uploadFile: vi.fn(),
};
vi.mock('../../services/file-upload.service', () => ({
  petImageUpload: petImageUploadMock,
  FileUploadService: fileUploadServiceMock,
}));

const enforceUploadMimeMock = vi.fn();
vi.mock('../../middleware/upload-mime-guard', () => ({
  enforceUploadMime: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    enforceUploadMimeMock(req, res, next),
}));

const authenticateTokenMock = vi.fn();
vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

const mockUser = {
  userId: 'user-abc',
  email: 'user@example.com',
  userType: 'adopter',
};

const buildApp = async () => {
  const app = express();
  const { default: uploadRouter } = await import('../../routes/upload.routes');
  app.use('/api/v1/uploads', uploadRouter);
  return app;
};

const installMulter = (
  options: Parameters<typeof multer>[0] = { storage: multer.memoryStorage() }
) => {
  const realMulter = multer(options);
  petImageUploadMock.single.mockImplementation(realMulter.single.bind(realMulter));
};

const installAuthenticated = () => {
  authenticateTokenMock.mockImplementation(
    (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      req.user = mockUser as AuthenticatedRequest['user'];
      next();
    }
  );
};

const installPassthroughMimeGuard = () => {
  enforceUploadMimeMock.mockImplementation(
    (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
  );
};

describe('POST /api/v1/uploads/images — staged image upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installAuthenticated();
    installPassthroughMimeGuard();
    installMulter({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          cb(new Error(`File type ${file.mimetype} is not allowed`));
          return;
        }
        cb(null, true);
      },
    });
  });

  it('returns 200 with the documented response shape on a successful upload', async () => {
    fileUploadServiceMock.uploadFile.mockResolvedValue({
      success: true,
      upload: {
        upload_id: 'upload-123',
        original_filename: 'photo.jpg',
        stored_filename: 'pets_1700000000_abc.jpg',
        file_path: 'pets/pets_1700000000_abc.jpg',
        mime_type: 'image/jpeg',
        file_size: 1234,
        url: '/uploads/pets/pets_1700000000_abc.jpg',
        thumbnail_url: '/uploads/pets/pets_1700000000_abc.thumb.jpg',
        uploaded_by: 'user-abc',
        metadata: {
          uploadedAt: '2026-05-16T00:00:00.000Z',
          lastModified: '2026-05-16T00:00:00.000Z',
          checksum: 'abc',
        },
        created_at: new Date('2026-05-16'),
        updated_at: new Date('2026-05-16'),
      },
    });

    const app = await buildApp();
    const response = await request(app)
      .post('/api/v1/uploads/images')
      .attach('image', Buffer.from('fake jpg bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      url: '/uploads/pets/pets_1700000000_abc.jpg',
      thumbnail_url: '/uploads/pets/pets_1700000000_abc.thumb.jpg',
      original_filename: 'photo.jpg',
      size_bytes: 1234,
      content_type: 'image/jpeg',
    });
    expect(fileUploadServiceMock.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'photo.jpg', mimetype: 'image/jpeg' }),
      'pets',
      expect.objectContaining({ uploadedBy: 'user-abc' })
    );
  });

  it('returns 401 when the requester is not authenticated', async () => {
    authenticateTokenMock.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(401).json({ error: 'Unauthorised' });
      }
    );

    const app = await buildApp();
    const response = await request(app)
      .post('/api/v1/uploads/images')
      .attach('image', Buffer.from('fake jpg bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(401);
    expect(fileUploadServiceMock.uploadFile).not.toHaveBeenCalled();
  });

  it('returns 400 when the file MIME type is not on the image allowlist', async () => {
    const app = await buildApp();
    const response = await request(app)
      .post('/api/v1/uploads/images')
      .attach('image', Buffer.from('plain text payload'), {
        filename: 'evil.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(fileUploadServiceMock.uploadFile).not.toHaveBeenCalled();
  });

  it('returns 413 when the file exceeds the multer size limit', async () => {
    installMulter({
      storage: multer.memoryStorage(),
      // 32-byte ceiling so a tiny test payload trips LIMIT_FILE_SIZE
      // without consuming real memory.
      limits: { fileSize: 32 },
      fileFilter: (_req, _file, cb) => cb(null, true),
    });

    const app = await buildApp();
    const oversized = Buffer.alloc(64, 'A');
    const response = await request(app)
      .post('/api/v1/uploads/images')
      .attach('image', oversized, { filename: 'big.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(413);
    expect(fileUploadServiceMock.uploadFile).not.toHaveBeenCalled();
  });

  it('returns 400 when the magic-byte guard reports a content/MIME mismatch', async () => {
    enforceUploadMimeMock.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(400).json({
          error: 'Uploaded file content does not match declared type',
          details: ['File evil.jpg declares image/jpeg but content is text/html'],
        });
      }
    );

    const app = await buildApp();
    const response = await request(app)
      .post('/api/v1/uploads/images')
      .attach('image', Buffer.from('<html>not a jpeg</html>'), {
        filename: 'evil.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(400);
    expect(fileUploadServiceMock.uploadFile).not.toHaveBeenCalled();
  });

  it('returns 400 when the request omits the file field', async () => {
    const app = await buildApp();
    const response = await request(app).post('/api/v1/uploads/images');

    expect(response.status).toBe(400);
    expect(fileUploadServiceMock.uploadFile).not.toHaveBeenCalled();
  });
});
