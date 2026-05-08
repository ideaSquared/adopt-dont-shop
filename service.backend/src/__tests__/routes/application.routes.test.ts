import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  loggerHelpers: { logSecurity: vi.fn() },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

vi.mock('../../services/application.service', () => ({
  ApplicationService: {
    getApplications: vi.fn(),
    getApplicationById: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    updateApplicationStatus: vi.fn(),
    withdrawApplication: vi.fn(),
    deleteApplication: vi.fn(),
    getApplicationStatistics: vi.fn(),
    bulkUpdateApplications: vi.fn(),
    getApplicationHistory: vi.fn(),
    getApplicationFormStructure: vi.fn(),
    validateApplicationAnswers: vi.fn(),
  },
  default: {
    getApplications: vi.fn(),
    getApplicationById: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    updateApplicationStatus: vi.fn(),
    withdrawApplication: vi.fn(),
    deleteApplication: vi.fn(),
    getApplicationStatistics: vi.fn(),
    bulkUpdateApplications: vi.fn(),
    getApplicationHistory: vi.fn(),
    getApplicationFormStructure: vi.fn(),
    validateApplicationAnswers: vi.fn(),
  },
}));

vi.mock('../../services/rich-text-processing.service', () => ({
  RichTextProcessingService: {
    sanitize: vi.fn((content: string) => content),
    sanitizeHtml: vi.fn((content: string) => content),
    processMarkdown: vi.fn((content: string) => content),
  },
}));

vi.mock('../../services/file-upload.service', () => ({
  applicationDocumentUpload: {
    single: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  uploadLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/upload-mime-guard', () => ({
  enforceUploadMime: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/field-permissions', () => ({
  fieldMask: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  fieldWriteGuard: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();
const requireRoleMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requireRole:
    (..._roles: string[]) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requireRoleMock(req, res, next),
  requirePermission:
    (_perm: string) => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
}));

import applicationRouter from '../../routes/application.routes';

const mockAdopterUser = {
  userId: 'adopter-uuid-1',
  email: 'adopter@example.com',
  firstName: 'Adopter',
  lastName: 'User',
  userType: 'ADOPTER',
  Roles: [],
};

const mockRescueStaffUser = {
  userId: 'staff-uuid-1',
  email: 'staff@example.com',
  firstName: 'Staff',
  lastName: 'Member',
  userType: 'RESCUE_STAFF',
  Roles: [],
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/applications', applicationRouter);
  return app;
};

describe('Application routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated as adopter, role check passes
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockAdopterUser as AuthenticatedRequest['user'];
        next();
      }
    );
    requireRoleMock.mockImplementation(
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  describe('GET /api/v1/applications', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get('/api/v1/applications');
      expect(res.status).toBe(401);
    });

    it('passes the auth layer when authenticated', async () => {
      // Verifies the auth + field-mask middleware chain allows the request
      // through. Service will throw without a real DB (500) or succeed (200).
      const res = await request(buildApp()).get('/api/v1/applications');
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('POST /api/v1/applications', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp())
        .post('/api/v1/applications')
        .send({ petId: 'pet-uuid-1', answers: {} });

      expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks the ADOPTER role', async () => {
      requireRoleMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(403).json({ error: 'Access denied' });
      });
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockRescueStaffUser as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp())
        .post('/api/v1/applications')
        .send({ petId: 'pet-uuid-1', answers: {} });

      expect(res.status).toBe(403);
    });

    it('returns 422 when petId is missing', async () => {
      const res = await request(buildApp()).post('/api/v1/applications').send({ answers: {} });

      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /api/v1/applications/:applicationId/status', () => {
    const applicationId = 'app-uuid-1';

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp())
        .patch(`/api/v1/applications/${applicationId}/status`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(401);
    });

    it('returns 403 when adopter tries to update application status', async () => {
      requireRoleMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(403).json({ error: 'Access denied' });
      });

      const res = await request(buildApp())
        .patch(`/api/v1/applications/${applicationId}/status`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('returns 422 when status field is missing', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockRescueStaffUser as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp())
        .patch(`/api/v1/applications/${applicationId}/status`)
        .send({});

      expect(res.status).toBe(422);
    });
  });
});
