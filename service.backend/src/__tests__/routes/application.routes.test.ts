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
    getStaffRescueIdForUser: vi.fn(),
    bulkUpdateApplications: vi.fn(),
    getApplicationHistory: vi.fn(),
    getApplicationFormStructure: vi.fn(),
    validateApplicationAnswers: vi.fn(),
    updateHomeVisit: vi.fn(),
    getApplicationActivityLog: vi.fn(),
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
    getStaffRescueIdForUser: vi.fn(),
    bulkUpdateApplications: vi.fn(),
    getApplicationHistory: vi.fn(),
    getApplicationFormStructure: vi.fn(),
    validateApplicationAnswers: vi.fn(),
    updateHomeVisit: vi.fn(),
    getApplicationActivityLog: vi.fn(),
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

// Module-level mutable counters so the per-test handlers can simulate the
// real express-rate-limit behaviour (429 on the (max+1)th request).
const dailyCounter = { count: 0, max: 5 };
const weeklyCounter = { count: 0, max: 20 };

vi.mock('../../middleware/user-abuse-rate-limit', () => ({
  applicationCreateDailyLimiter: (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    dailyCounter.count += 1;
    if (dailyCounter.count > dailyCounter.max) {
      res.status(429).json({ error: 'daily limit' });
      return;
    }
    next();
  },
  applicationCreateWeeklyLimiter: (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    weeklyCounter.count += 1;
    if (weeklyCounter.count > weeklyCounter.max) {
      res.status(429).json({ error: 'weekly limit' });
      return;
    }
    next();
  },
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
const requirePermissionMock = vi.fn();

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
    (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionMock(perm, req, res, next),
}));

import applicationRouter from '../../routes/application.routes';
import { ApplicationService } from '../../services/application.service';

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
  userType: 'rescue_staff',
  Roles: [],
};

const mockAdminUser = {
  userId: 'admin-uuid-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  userType: 'admin',
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
    // Reset the per-user limiter counters so each test starts clean.
    dailyCounter.count = 0;
    weeklyCounter.count = 0;
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
    requirePermissionMock.mockImplementation(
      (_perm: string, _req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
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

    it('allows up to 5 applications per user within the daily window', async () => {
      // Service returns success so the route reaches a 2xx response and
      // we can confirm the limiter let it through.
      vi.mocked(ApplicationService.createApplication).mockResolvedValue({
        applicationId: 'app-1',
      } as unknown as Awaited<ReturnType<typeof ApplicationService.createApplication>>);

      const app = buildApp();
      for (let i = 0; i < 4; i += 1) {
        const res = await request(app)
          .post('/api/v1/applications')
          .send({ petId: 'pet-uuid-1', answers: {} });
        expect(res.status).not.toBe(429);
      }
    });

    it('rejects the 6th application in a 24h window with 429', async () => {
      vi.mocked(ApplicationService.createApplication).mockResolvedValue({
        applicationId: 'app-1',
      } as unknown as Awaited<ReturnType<typeof ApplicationService.createApplication>>);

      const app = buildApp();
      // First 5 pass through the daily limiter.
      for (let i = 0; i < 5; i += 1) {
        await request(app).post('/api/v1/applications').send({ petId: 'pet-uuid-1', answers: {} });
      }
      const res = await request(app)
        .post('/api/v1/applications')
        .send({ petId: 'pet-uuid-1', answers: {} });
      expect(res.status).toBe(429);
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

  describe('GET /api/v1/applications/statistics', () => {
    const emptyStats = {
      totalApplications: 0,
      applicationsByStatus: {},
      applicationsByPriority: {},
      averageProcessingTime: 0,
      approvalRate: 0,
      rejectionRate: 0,
      withdrawalRate: 0,
      applicationsThisMonth: 0,
      applicationsLastMonth: 0,
      growthRate: 0,
      averageScore: 0,
      pendingApplications: 0,
      overdueApplications: 0,
      topRejectionReasons: [],
      applicationsByRescue: [],
      applicationsByMonth: [],
    };

    beforeEach(() => {
      vi.mocked(ApplicationService.getApplicationStatistics).mockResolvedValue(emptyStats);
    });

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get('/api/v1/applications/statistics');
      expect(res.status).toBe(401);
      expect(ApplicationService.getApplicationStatistics).not.toHaveBeenCalled();
    });

    it("scopes statistics to the rescue staff member's own rescue", async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockRescueStaffUser as AuthenticatedRequest['user'];
          next();
        }
      );
      vi.mocked(ApplicationService.getStaffRescueIdForUser).mockResolvedValue('rescue-A');

      const res = await request(buildApp()).get('/api/v1/applications/statistics');

      expect(res.status).toBe(200);
      expect(ApplicationService.getStaffRescueIdForUser).toHaveBeenCalledWith(
        mockRescueStaffUser.userId
      );
      expect(ApplicationService.getApplicationStatistics).toHaveBeenCalledWith('rescue-A');
    });

    it('ignores ?rescueId query overrides from rescue staff', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockRescueStaffUser as AuthenticatedRequest['user'];
          next();
        }
      );
      vi.mocked(ApplicationService.getStaffRescueIdForUser).mockResolvedValue('rescue-A');

      const res = await request(buildApp())
        .get('/api/v1/applications/statistics')
        .query({ rescueId: 'rescue-B' });

      expect(res.status).toBe(200);
      expect(ApplicationService.getApplicationStatistics).toHaveBeenCalledWith('rescue-A');
      expect(ApplicationService.getApplicationStatistics).not.toHaveBeenCalledWith('rescue-B');
    });

    it('forbids rescue staff who are not linked to a verified rescue', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockRescueStaffUser as AuthenticatedRequest['user'];
          next();
        }
      );
      vi.mocked(ApplicationService.getStaffRescueIdForUser).mockResolvedValue(null);

      const res = await request(buildApp()).get('/api/v1/applications/statistics');

      expect(res.status).toBe(403);
      expect(ApplicationService.getApplicationStatistics).not.toHaveBeenCalled();
    });

    it('returns global statistics for an admin with no rescueId query', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockAdminUser as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp()).get('/api/v1/applications/statistics');

      expect(res.status).toBe(200);
      expect(ApplicationService.getStaffRescueIdForUser).not.toHaveBeenCalled();
      expect(ApplicationService.getApplicationStatistics).toHaveBeenCalledWith(undefined);
    });

    it('lets an admin scope statistics to a specific rescue via ?rescueId', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockAdminUser as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp())
        .get('/api/v1/applications/statistics')
        .query({ rescueId: 'rescue-B' });

      expect(res.status).toBe(200);
      expect(ApplicationService.getApplicationStatistics).toHaveBeenCalledWith('rescue-B');
    });
  });

  describe('PUT /api/v1/applications/:applicationId/home-visits/:visitId', () => {
    const applicationId = '11111111-1111-1111-1111-111111111111';
    const visitId = '22222222-2222-2222-2222-222222222222';

    beforeEach(() => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockRescueStaffUser as AuthenticatedRequest['user'];
          next();
        }
      );
      vi.mocked(ApplicationService.updateHomeVisit).mockResolvedValue({
        id: visitId,
      } as unknown as Awaited<ReturnType<typeof ApplicationService.updateHomeVisit>>);
    });

    it('translates snake_case body fields to camelCase before calling the service', async () => {
      const res = await request(buildApp())
        .put(`/api/v1/applications/${applicationId}/home-visits/${visitId}`)
        .send({
          scheduled_date: '2026-06-01',
          scheduled_time: '14:00',
          assigned_staff: 'staff-uuid-1',
          notes: 'bring paperwork',
          outcome: 'approved',
          outcome_notes: 'all good',
          reschedule_reason: 'weather',
          cancelled_reason: 'no-show',
          status: 'completed',
        });

      expect(res.status).toBe(200);
      expect(ApplicationService.updateHomeVisit).toHaveBeenCalledTimes(1);
      const [passedApplicationId, , passedUpdate, passedActor] = vi.mocked(
        ApplicationService.updateHomeVisit
      ).mock.calls[0];
      expect(passedApplicationId).toBe(applicationId);
      expect(passedActor).toBe(mockRescueStaffUser.userId);
      expect(passedUpdate).toMatchObject({
        scheduledDate: '2026-06-01',
        scheduledTime: '14:00',
        assignedStaff: 'staff-uuid-1',
        notes: 'bring paperwork',
        outcome: 'approved',
        outcomeNotes: 'all good',
        rescheduleReason: 'weather',
        cancelledReason: 'no-show',
        status: 'completed',
      });
      // Service must NOT receive snake_case keys it would silently ignore.
      expect(passedUpdate).not.toHaveProperty('scheduled_date');
      expect(passedUpdate).not.toHaveProperty('reschedule_reason');
      expect(passedUpdate).not.toHaveProperty('cancelled_reason');
    });

    it('returns 404 when the service reports the visit was not found', async () => {
      vi.mocked(ApplicationService.updateHomeVisit).mockResolvedValue(null);

      const res = await request(buildApp())
        .put(`/api/v1/applications/${applicationId}/home-visits/${visitId}`)
        .send({ status: 'cancelled', cancelled_reason: 'duplicate' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/applications/:applicationId/activity', () => {
    const applicationId = 'app-uuid-1';

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get(`/api/v1/applications/${applicationId}/activity`);

      expect(res.status).toBe(401);
      expect(ApplicationService.getApplicationActivityLog).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller lacks applications.read permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp()).get(`/api/v1/applications/${applicationId}/activity`);

      expect(res.status).toBe(403);
      expect(ApplicationService.getApplicationActivityLog).not.toHaveBeenCalled();
    });

    it('gates the route on applications.read', async () => {
      vi.mocked(ApplicationService.getApplicationActivityLog).mockResolvedValue([]);

      await request(buildApp()).get(`/api/v1/applications/${applicationId}/activity`);

      expect(requirePermissionMock).toHaveBeenCalledWith(
        'applications.read',
        expect.anything(),
        expect.anything(),
        expect.any(Function)
      );
    });

    it('delegates to ApplicationService.getApplicationActivityLog with parsed query params', async () => {
      vi.mocked(ApplicationService.getApplicationActivityLog).mockResolvedValue([]);

      const res = await request(buildApp())
        .get(`/api/v1/applications/${applicationId}/activity`)
        .query({ from: '2026-01-01', to: '2026-02-01', limit: '25', offset: '10' });

      expect(res.status).toBe(200);
      expect(ApplicationService.getApplicationActivityLog).toHaveBeenCalledWith(applicationId, {
        from: '2026-01-01',
        to: '2026-02-01',
        limit: 25,
        offset: 10,
      });
    });

    it('returns the activity rows in the {success, data} envelope', async () => {
      const activity = [
        {
          activityId: 7,
          activityType: 'application' as const,
          action: 'APPLICATION_SUBMITTED',
          description: 'Submitted application for Rex',
          category: 'Application',
          ipAddress: null,
          userAgent: null,
          createdAt: '2026-01-15T12:00:00.000Z',
        },
      ];
      vi.mocked(ApplicationService.getApplicationActivityLog).mockResolvedValue(activity);

      const res = await request(buildApp()).get(`/api/v1/applications/${applicationId}/activity`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: activity });
    });
  });
});
