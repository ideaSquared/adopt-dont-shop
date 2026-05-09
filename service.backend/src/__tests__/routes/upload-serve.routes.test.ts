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

// ── Shared mocks ────────────────────────────────────────────────────────────────

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
  const uploadDir = nodePath.resolve(__dirname, '..', '..', '..', '..', 'test-uploads-tmp');
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

// ACL helper is mocked here so the route tests prove the wiring: the
// route forwards (filePath, user) to the helper and returns whatever
// status verdict it produces. The helper itself is exercised through
// model-mocked cases further below.
const decideUploadAccessMock = vi.fn();
vi.mock('../../services/upload-acl.service', () => ({
  decideUploadAccess: (...args: unknown[]) => decideUploadAccessMock(...args),
}));

// ── Test helpers ────────────────────────────────────────────────────────────────

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
    // Default ACL verdict = allow. Individual ACL tests below override
    // this to assert deny / not-found behaviour.
    decideUploadAccessMock.mockResolvedValue(200);
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
      fs.mkdirSync(path.join(TEST_UPLOAD_DIR, 'profiles'), { recursive: true });
      fs.writeFileSync(path.join(TEST_UPLOAD_DIR, 'profiles', 'avatar.jpg'), 'fake jpg');

      const response = await request(app)
        .get('/api/v1/uploads/authorize')
        .set('X-Original-URI', '/uploads/profiles/avatar.jpg')
        .query({ path: 'profiles/avatar.jpg' });

      expect(response.status).toBe(200);
    });

    // ── per-resource ACL wiring ────────────────────────────────────────────
    //
    // The route delegates per-resource decisions to decideUploadAccess.
    // These tests assert that:
    //   1. the route forwards the request path + authenticated user, and
    //   2. it returns whatever HTTP status the helper produces, with an
    //      empty body so nginx can act on the status alone.
    describe('per-resource ACL', () => {
      const seedFile = (relPath: string) => {
        const dir = path.dirname(path.join(TEST_UPLOAD_DIR, relPath));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(TEST_UPLOAD_DIR, relPath), 'data');
      };

      it('returns 200 when the ACL helper allows the owner to read a private application doc', async () => {
        seedFile('applications/app_123_owner.pdf');
        decideUploadAccessMock.mockResolvedValue(200);

        const response = await request(app)
          .get('/api/v1/uploads/authorize')
          .query({ path: 'applications/app_123_owner.pdf' });

        expect(response.status).toBe(200);
        expect(response.text).toBe('');
        expect(decideUploadAccessMock).toHaveBeenCalledWith({
          filePath: 'applications/app_123_owner.pdf',
          user: expect.objectContaining({ userId: mockUser.userId }),
        });
      });

      it('returns 403 when the ACL helper denies a non-owner / non-staff requester', async () => {
        seedFile('applications/app_123_owner.pdf');
        decideUploadAccessMock.mockResolvedValue(403);

        const response = await request(app)
          .get('/api/v1/uploads/authorize')
          .query({ path: 'applications/app_123_owner.pdf' });

        expect(response.status).toBe(403);
        expect(response.text).toBe('');
      });

      it('returns 200 when the ACL helper recognises the requester as staff of the correct rescue', async () => {
        seedFile('applications/app_456_staff.pdf');
        decideUploadAccessMock.mockResolvedValue(200);

        const response = await request(app)
          .get('/api/v1/uploads/authorize')
          .query({ path: 'applications/app_456_staff.pdf' });

        expect(response.status).toBe(200);
      });

      it('returns 403 when the ACL helper rejects staff of a different rescue', async () => {
        seedFile('applications/app_789_other.pdf');
        decideUploadAccessMock.mockResolvedValue(403);

        const response = await request(app)
          .get('/api/v1/uploads/authorize')
          .query({ path: 'applications/app_789_other.pdf' });

        expect(response.status).toBe(403);
      });

      it('returns 200 for public path-shapes (pet photos) without consulting per-resource state', async () => {
        seedFile('pets/photo.jpg');
        // helper returns 200 for public prefixes — we just assert the
        // route honours the verdict.
        decideUploadAccessMock.mockResolvedValue(200);

        const response = await request(app)
          .get('/api/v1/uploads/authorize')
          .query({ path: 'pets/photo.jpg' });

        expect(response.status).toBe(200);
      });

      it('returns 404 when the ACL helper reports an unknown path-shape', async () => {
        seedFile('mystery/file.bin');
        decideUploadAccessMock.mockResolvedValue(404);

        const response = await request(app)
          .get('/api/v1/uploads/authorize')
          .query({ path: 'mystery/file.bin' });

        expect(response.status).toBe(404);
      });

      it('fails closed with 403 when the ACL helper throws unexpectedly', async () => {
        seedFile('applications/exploding.pdf');
        decideUploadAccessMock.mockRejectedValue(new Error('db down'));

        const response = await request(app)
          .get('/api/v1/uploads/authorize')
          .query({ path: 'applications/exploding.pdf' });

        expect(response.status).toBe(403);
      });
    });
  });
});

// ── /uploads/:path — Express fallback for local dev ─────────────────────────

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

// ── decideUploadAccess helper — per-resource ACL business behaviour ──────────
//
// Mocks the model layer and exercises the helper directly. The route tests
// above prove the helper is wired into the authorize endpoint; these tests
// prove the helper itself makes the right decisions for each path-shape.

const fileUploadFindOneMock = vi.fn();
const applicationFindByPkMock = vi.fn();
const staffFindOneMock = vi.fn();
const chatParticipantFindOneMock = vi.fn();

vi.mock('../../models/FileUpload', () => ({
  default: {
    findOne: (...args: unknown[]) => fileUploadFindOneMock(...args),
  },
}));
vi.mock('../../models/Application', () => ({
  default: {
    findByPk: (...args: unknown[]) => applicationFindByPkMock(...args),
  },
}));
vi.mock('../../models/StaffMember', () => ({
  default: {
    findOne: (...args: unknown[]) => staffFindOneMock(...args),
  },
}));
vi.mock('../../models/ChatParticipant', () => {
  const stub = {
    findOne: (...args: unknown[]) => chatParticipantFindOneMock(...args),
  };
  return { default: stub, ChatParticipant: stub };
});
vi.mock('../../models/User', () => ({
  default: class {},
  UserType: {
    ADOPTER: 'adopter',
    RESCUE_STAFF: 'rescue_staff',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
  },
}));

type FakeUser = { userId: string; userType: string };
const fakeUser = (overrides: Partial<FakeUser> = {}): FakeUser => ({
  userId: 'user-1',
  userType: 'adopter',
  ...overrides,
});

describe('decideUploadAccess — per-resource ACL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-enable the real helper (it's mocked at the top of the file for
    // the route tests). Vitest's vi.unmock is hoisted; vi.doUnmock works
    // at runtime but doesn't affect already-imported modules. We work
    // around it with a dynamic import inside each test that uses
    // vi.importActual.
  });

  // Tests use vi.importActual so the *real* helper runs against the
  // mocked model layer above.
  const loadHelper = async () =>
    (
      await vi.importActual<typeof import('../../services/upload-acl.service')>(
        '../../services/upload-acl.service'
      )
    ).decideUploadAccess;

  it('allows the application owner to read their own application document', async () => {
    fileUploadFindOneMock.mockResolvedValue({
      upload_id: 'u1',
      uploaded_by: 'owner-1',
      entity_id: 'app-1',
      entity_type: 'application',
    });
    applicationFindByPkMock.mockResolvedValue({ userId: 'owner-1', rescueId: 'r-1' });

    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'applications/applications_123_file.pdf',
      user: fakeUser({ userId: 'owner-1' }) as never,
    });

    expect(verdict).toBe(200);
  });

  it("denies an authenticated stranger from reading someone else's application document", async () => {
    fileUploadFindOneMock.mockResolvedValue({
      upload_id: 'u1',
      uploaded_by: 'owner-1',
      entity_id: 'app-1',
      entity_type: 'application',
    });
    applicationFindByPkMock.mockResolvedValue({ userId: 'owner-1', rescueId: 'r-1' });
    staffFindOneMock.mockResolvedValue(null);

    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'applications/applications_123_file.pdf',
      user: fakeUser({ userId: 'stranger-9' }) as never,
    });

    expect(verdict).toBe(403);
  });

  it("allows verified staff of the application's rescue to read the document", async () => {
    fileUploadFindOneMock.mockResolvedValue({
      upload_id: 'u1',
      uploaded_by: 'owner-1',
      entity_id: 'app-1',
      entity_type: 'application',
    });
    applicationFindByPkMock.mockResolvedValue({ userId: 'owner-1', rescueId: 'r-1' });
    staffFindOneMock.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      where.rescueId === 'r-1' && where.userId === 'staff-1' && where.isVerified === true
        ? Promise.resolve({ staffMemberId: 's1' })
        : Promise.resolve(null)
    );

    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'applications/applications_123_file.pdf',
      user: fakeUser({ userId: 'staff-1', userType: 'rescue_staff' }) as never,
    });

    expect(verdict).toBe(200);
  });

  it('denies staff of a different rescue from reading the application document', async () => {
    fileUploadFindOneMock.mockResolvedValue({
      upload_id: 'u1',
      uploaded_by: 'owner-1',
      entity_id: 'app-1',
      entity_type: 'application',
    });
    applicationFindByPkMock.mockResolvedValue({ userId: 'owner-1', rescueId: 'r-1' });
    // No staff_members row for (staff-2, r-1) — the user is staff at a
    // *different* rescue (r-2), but only the (userId, rescueId) pair on
    // *this* application matters.
    staffFindOneMock.mockResolvedValue(null);

    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'applications/applications_123_file.pdf',
      user: fakeUser({ userId: 'staff-2', userType: 'rescue_staff' }) as never,
    });

    expect(verdict).toBe(403);
  });

  it('treats pet photos as public — no FileUpload lookup, returns 200', async () => {
    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'pets/pets_123_photo.jpg',
      user: fakeUser({ userId: 'anyone' }) as never,
    });

    expect(verdict).toBe(200);
    expect(fileUploadFindOneMock).not.toHaveBeenCalled();
  });

  it('treats profile avatars as public — no FileUpload lookup, returns 200', async () => {
    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'profiles/profiles_123_avatar.jpg',
      user: fakeUser({ userId: 'anyone' }) as never,
    });

    expect(verdict).toBe(200);
    expect(fileUploadFindOneMock).not.toHaveBeenCalled();
  });

  it('returns 404 for a path-shape that does not match any known prefix', async () => {
    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'unknown-folder/file.bin',
      user: fakeUser() as never,
    });

    expect(verdict).toBe(404);
  });

  it('returns 404 for a path with no prefix segment (single-segment path)', async () => {
    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'orphan.pdf',
      user: fakeUser() as never,
    });

    expect(verdict).toBe(404);
  });

  it('returns 200 for any private upload when the requester is an admin', async () => {
    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'applications/anything.pdf',
      user: fakeUser({ userId: 'admin-1', userType: 'admin' }) as never,
    });

    expect(verdict).toBe(200);
    // Admin bypass short-circuits before any DB lookup.
    expect(fileUploadFindOneMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the FileUpload record for a private path is missing', async () => {
    fileUploadFindOneMock.mockResolvedValue(null);

    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'applications/missing.pdf',
      user: fakeUser({ userId: 'someone' }) as never,
    });

    expect(verdict).toBe(404);
  });

  it('allows a chat participant to read a chat attachment', async () => {
    fileUploadFindOneMock.mockResolvedValue({
      upload_id: 'u1',
      uploaded_by: 'sender-1',
      entity_id: 'chat-1',
      entity_type: 'chat',
    });
    chatParticipantFindOneMock.mockResolvedValue({ chat_participant_id: 'cp1' });

    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'chat/chat_123_attachment.png',
      user: fakeUser({ userId: 'recipient-1' }) as never,
    });

    expect(verdict).toBe(200);
  });

  it('denies a non-participant from reading a chat attachment', async () => {
    fileUploadFindOneMock.mockResolvedValue({
      upload_id: 'u1',
      uploaded_by: 'sender-1',
      entity_id: 'chat-1',
      entity_type: 'chat',
    });
    chatParticipantFindOneMock.mockResolvedValue(null);

    const decide = await loadHelper();
    const verdict = await decide({
      filePath: 'chat/chat_123_attachment.png',
      user: fakeUser({ userId: 'eavesdropper' }) as never,
    });

    expect(verdict).toBe(403);
  });
});
