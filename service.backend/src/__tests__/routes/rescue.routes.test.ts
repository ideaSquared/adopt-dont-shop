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

vi.mock('../../services/rescue.service', () => ({
  RescueService: {
    searchRescues: vi.fn(),
    getRescueById: vi.fn(),
    createRescue: vi.fn(),
    updateRescue: vi.fn(),
    verifyRescue: vi.fn(),
    rejectRescue: vi.fn(),
    deleteRescue: vi.fn(),
    addStaffMember: vi.fn(),
    getRescueStaff: vi.fn(),
    removeStaffMember: vi.fn(),
    isUserStaffOfRescue: vi.fn(),
    bulkUpdateRescues: vi.fn(),
    getPendingInvitations: vi.fn(),
    cancelInvitation: vi.fn(),
    inviteStaffMember: vi.fn(),
    updateStaffMember: vi.fn(),
    getAdoptionPolicies: vi.fn(),
    updateAdoptionPolicies: vi.fn(),
    getRescueAnalytics: vi.fn(),
    getRescuePets: vi.fn(),
    sendEmail: vi.fn(),
    suspendRescue: vi.fn(),
  },
}));

vi.mock('../../services/invitation.service', () => ({
  InvitationService: {
    sendStaffInvitation: vi.fn(),
    getPendingInvitations: vi.fn(),
    cancelInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
    getInvitationDetails: vi.fn(),
  },
}));

vi.mock('../../services/rich-text-processing.service', () => ({
  RichTextProcessingService: { sanitize: vi.fn((content: string) => content) },
}));

vi.mock('../../services/email.service', () => ({
  default: {
    sendEmail: vi.fn(),
    queueEmail: vi.fn(),
  },
}));

vi.mock('../../services/question.service', () => ({
  QuestionService: {
    getQuestions: vi.fn(),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    reorderQuestions: vi.fn(),
  },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  searchLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  sensitiveWriteLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  invitationSendLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/field-permissions', () => ({
  fieldMask: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  fieldWriteGuard: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();
const requirePermissionMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
  optionalAuth: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  authenticateOptionalToken: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission:
    (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionMock(perm, req, res, next),
  requireRole:
    (..._roles: string[]) =>
    (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
}));

import rescueRouter from '../../routes/rescue.routes';

const mockAdminUser = {
  userId: 'admin-uuid-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  userType: 'ADMIN',
  Roles: [
    {
      Permissions: [
        { permissionName: 'rescues.verify' },
        { permissionName: 'rescues.update' },
        { permissionName: 'rescues.delete' },
        { permissionName: 'staff.read' },
        { permissionName: 'staff.create' },
      ],
    },
  ],
};

const rescueId = '11111111-1111-4111-8111-111111111111';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/rescues', rescueRouter);
  return app;
};

describe('Rescue routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockAdminUser as AuthenticatedRequest['user'];
        next();
      }
    );
    requirePermissionMock.mockImplementation(
      (_perm: string, _req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  describe('GET /api/v1/rescues (public search)', () => {
    it('is accessible without authentication', async () => {
      // Public route — no authenticateToken middleware on GET /
      const res = await request(buildApp()).get('/api/v1/rescues');
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('GET /api/v1/rescues/:rescueId (public detail)', () => {
    it('returns 422 when rescueId is not a valid UUID', async () => {
      const res = await request(buildApp()).get('/api/v1/rescues/not-a-uuid');
      expect(res.status).toBe(422);
    });

    it('is accessible without authentication for a valid UUID', async () => {
      const res = await request(buildApp()).get(`/api/v1/rescues/${rescueId}`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('POST /api/v1/rescues (create)', () => {
    const validBody = {
      name: 'Happy Paws Rescue',
      email: 'info@happypaws.example.com',
      phone: '+1234567890',
      address: '123 Main St',
      city: 'Springfield',
      country: 'US',
      rescueType: 'CHARITY',
    };

    it('returns 422 when required fields are missing', async () => {
      const res = await request(buildApp()).post('/api/v1/rescues').send({ name: 'Incomplete' });

      expect(res.status).toBe(422);
    });

    it('does not require authentication (registration flow)', async () => {
      // POST / is a public registration route — no authenticateToken required
      const res = await request(buildApp()).post('/api/v1/rescues').send(validBody);
      expect(res.status).not.toBe(401);
    });
  });

  describe('PUT /api/v1/rescues/:rescueId (update)', () => {
    it('returns 422 when rescueId is not a valid UUID', async () => {
      const res = await request(buildApp())
        .put('/api/v1/rescues/not-a-uuid')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(422);
    });

    it('returns 403 when user lacks rescues.update permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp())
        .put(`/api/v1/rescues/${rescueId}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/rescues/:rescueId/verify (admin verification)', () => {
    it('returns 422 when rescueId is not a valid UUID', async () => {
      const res = await request(buildApp())
        .post('/api/v1/rescues/not-a-uuid/verify')
        .send({ notes: 'All good' });

      expect(res.status).toBe(422);
    });

    it('returns 403 when user lacks rescues.verify permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp())
        .post(`/api/v1/rescues/${rescueId}/verify`)
        .send({ notes: 'All checks passed' });

      expect(res.status).toBe(403);
    });

    it('reaches the controller when properly authorised', async () => {
      const res = await request(buildApp())
        .post(`/api/v1/rescues/${rescueId}/verify`)
        .send({ notes: 'All checks passed' });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(422);
    });
  });

  describe('DELETE /api/v1/rescues/:rescueId (delete)', () => {
    it('returns 403 when user lacks rescues.delete permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp())
        .delete(`/api/v1/rescues/${rescueId}`)
        .send({ reason: 'Inactive organisation' });

      expect(res.status).toBe(403);
    });

    it('reaches the controller when properly authorised', async () => {
      const res = await request(buildApp())
        .delete(`/api/v1/rescues/${rescueId}`)
        .send({ reason: 'Inactive organisation' });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});
