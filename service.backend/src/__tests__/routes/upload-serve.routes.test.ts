/**
 * ADS-422: nginx auth_request subrequest endpoint tests.
 *
 * The /authorize endpoint is called internally by nginx before it streams the
 * file from the shared volume. The endpoint must:
 *   - Return 200 when the requester is authenticated and the path is valid.
 *   - Return 401 when no auth token is present.
 *   - Return 403 when the token is valid but the path is outside the upload
 *     directory (path traversal attempt).
 *   - Return 404 when the path does not resolve to an existing file.
 *
 * The existing /uploads/:path streaming route is preserved for local dev
 * and tested separately below.
 */

import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import type { AuthenticatedRequest } from '../../types';

// The upload directory must sit inside the project root because safeResolve
// rejects paths outside of it. __dirname here is
// service.backend/src/__tests__/routes — going up 4 levels reaches the
// worktree root, then we append a uniquely-named subdir to avoid conflicts
// with other test runs.
const TEST_UPLOAD_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'test-uploads-tmp');

// ── Shared mocks ─────────────────────────────────────────────────────────────

// setup-tests.ts globally mocks `fs` to prevent file I/O. We need real fs
// here because we are testing the file-serving route itself. Restore it for
// this test file only.
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return { ...actual, default: actual };
});

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn() },
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
  apiLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  searchLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  reportLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  sensitiveWriteLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  accountDeletionLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
  invitationSendLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

// Mock config so we control the uploads directory in tests.
// The directory must be inside the project root — safeResolve enforces this.
// We compute the same path as TEST_UPLOAD_DIR using require('path') because
// vi.mock factory functions run in a hoisted context where module-level
// variables are not yet initialised.
vi.mock('../../config', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodePath = require('path') as typeof import('path');
  const uploadDir = nodePath.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'test-uploads-tmp'
  );
  return {
    config: {
      storage: {
        provider: 'local',
        local: {
          directory: uploadDir,
          publicPath: '/uploads',
          maxFileSize: 10485760,
          allowedMimeTypes: ['image/jpeg', 'image/png'],
          serveLocalUploads: true,
        },
      },
    },
  };
});

const authenticateTokenMock = vi.fn();
vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

// ── Test helpers ─────────────────────────────────────────────────────────────

const mockUser = {
  userId: 'user-abc',
  email: 'user@example.com',
  userType: 'adopter',
};

const buildApp = async () => {
  const app = express();
  app.use(express.json());
  const { default: uploadServeRouter } = await import('../../routes/upload-serve.routes');
  app.use('/', uploadServeRouter);
  return app;
};

// ── /api/v1/uploads/authorize — nginx auth_request endpoint ──────────────────

describe('GET /api/v1/uploads/authorize — nginx auth_request subrequest', () => {
  let app: express.Application;

  beforeEach(async () => {
    vi.clearAllMocks();
    fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
    app = await buildApp();
  });

  afterEach(() => {
    try {
      fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('when the requester is not authenticated', () => {
    it('returns 401 so nginx rejects the request without serving the file', async () => {
      authenticateTokenMock.mockImplementation(
        (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
          res.status(401).json({ error: 'Unauthorised' });
        }
      );

      const response = await request(app)
        .get('/api/v1/uploads/authorize')
        .query({ path: 'pets/photo.jpg' });

      expect(response.status).toBe(401);
    });
  });

  describe('when the requester is authenticated', () => {
    beforeEach(() => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockUser as AuthenticatedRequest['user'];
          next();
        }
      );
    });

    it('returns 400 when no path query parameter is provided', async () => {
      const response = await request(app).get('/api/v1/uploads/authorize');

      expect(response.status).toBe(400);
    });

    it('returns 403 when the path contains traversal sequences', async () => {
      const response = await request(app)
        .get('/api/v1/uploads/authorize')
        .query({ path: '../etc/passwd' });

      expect(response.status).toBe(403);
    });

    it('returns 403 when the path resolves outside the uploads directory', async () => {
      const response = await request(app)
        .get('/api/v1/uploads/authorize')
        .query({ path: '../../service.backend/src/config/env.ts' });

      expect(response.status).toBe(403);
    });

    it('returns 404 when the path is valid but the file does not exist', async () => {
      const response = await request(app)
        .get('/api/v1/uploads/authorize')
        .query({ path: 'pets/nonexistent.jpg' });

      expect(response.status).toBe(404);
    });

    it('returns 200 with no body when the path is valid and the file exists', async () => {
      fs.mkdirSync(path.join(TEST_UPLOAD_DIR, 'pets'), { recursive: true });
      fs.writeFileSync(path.join(TEST_UPLOAD_DIR, 'pets', 'photo.jpg'), 'fake image data');

      const response = await request(app)
        .get('/api/v1/uploads/authorize')
        .query({ path: 'pets/photo.jpg' });

      expect(response.status).toBe(200);
      // nginx auth_request only inspects the status code; body must be empty
      expect(response.text).toBe('');
    });

    it('honours the X-Original-URI header forwarded by nginx in addition to the path param', async () => {
      fs.mkdirSync(path.join(TEST_UPLOAD_DIR, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(TEST_UPLOAD_DIR, 'docs', 'report.pdf'), 'fake pdf');

      const response = await request(app)
        .get('/api/v1/uploads/authorize')
        .set('X-Original-URI', '/uploads/docs/report.pdf')
        .query({ path: 'docs/report.pdf' });

      expect(response.status).toBe(200);
    });
  });
});

// ── /uploads/:path — Express fallback for local dev ──────────────────────────

describe('GET /uploads/:path — Express fallback streaming route', () => {
  let app: express.Application;

  beforeEach(async () => {
    vi.clearAllMocks();
    fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
    app = await buildApp();
  });

  afterEach(() => {
    try {
      fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('returns 401 when the requester has no auth token', async () => {
    authenticateTokenMock.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(401).json({ error: 'Unauthorised' });
      }
    );

    const response = await request(app).get('/uploads/pets/photo.jpg');
    expect(response.status).toBe(401);
  });

  it('streams the file when the requester is authenticated and the file exists', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );

    fs.mkdirSync(path.join(TEST_UPLOAD_DIR, 'pets'), { recursive: true });
    fs.writeFileSync(path.join(TEST_UPLOAD_DIR, 'pets', 'cat.png'), 'fake png data');

    const response = await request(app).get('/uploads/pets/cat.png');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/image\/png/);
  });

  it('returns 404 when the file does not exist', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );

    const response = await request(app).get('/uploads/pets/missing.png');
    expect(response.status).toBe(404);
  });

  it('returns 400 when the path contains traversal sequences', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );

    const response = await request(app).get('/uploads/../etc/passwd');
    expect(response.status).toBe(400);
  });
});
