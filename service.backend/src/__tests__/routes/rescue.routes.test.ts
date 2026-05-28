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
    getRescueActivityLog: vi.fn(),
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
  rescueRegistrationLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
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

vi.mock('../../middleware/rbac', async () => {
  // Tenant guard uses the *real* implementation so the cross-tenant tests
  // exercise actual behaviour rather than a passthrough mock. Permission
  // and role checks remain mocked so they don't interfere.
  const actual =
    await vi.importActual<typeof import('../../middleware/rbac')>('../../middleware/rbac');
  return {
    requirePermission:
      (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
        requirePermissionMock(perm, req, res, next),
    requireRole:
      (..._roles: string[]) =>
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
        next(),
    requireRescueTenant: actual.requireRescueTenant,
  };
});

import rescueRouter from '../../routes/rescue.routes';

const mockAdminUser = {
  userId: 'admin-uuid-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  userType: 'admin',
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

  // Cross-tenant rescue access — staff of one rescue must not be able to act
  // on another rescue, even with the relevant `rescues.*` / `staff.*`
  // permissions. Platform admin / moderator user types bypass.
  describe('Rescue tenant scoping', () => {
    const otherRescueId = '22222222-2222-4222-8222-222222222222';

    const staffOfRescueA = {
      userId: 'staff-uuid-1',
      email: 'staff@rescue-a.example.com',
      firstName: 'Staff',
      lastName: 'A',
      userType: 'rescue_staff',
      rescueId,
      Roles: [
        {
          Permissions: [
            { permissionName: 'rescues.update' },
            { permissionName: 'rescues.delete' },
            { permissionName: 'staff.read' },
            { permissionName: 'staff.create' },
            { permissionName: 'staff.update' },
            { permissionName: 'staff.delete' },
            { permissionName: 'admin.reports' },
          ],
        },
      ],
    };

    const buildAppAsUser = (user: unknown) => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = user as AuthenticatedRequest['user'];
          next();
        }
      );
      return buildApp();
    };

    type TenantEndpoint = {
      label: string;
      method: 'put' | 'patch' | 'delete' | 'get' | 'post';
      path: (id: string) => string;
      body?: Record<string, unknown>;
    };

    // Routes covered by requireRescueTenant. Analytics is intentionally
    // omitted from the same-tenant pass-through assertion because the
    // downstream requirePlanFeature middleware loads from the DB and is
    // not mocked here; the tenant guard still runs first so cross-tenant
    // rejection for analytics is asserted via the explicit case below.
    const tenantScopedEndpoints: ReadonlyArray<TenantEndpoint> = [
      {
        label: 'PUT /:rescueId',
        method: 'put',
        path: id => `/api/v1/rescues/${id}`,
        body: { name: 'New Name' },
      },
      {
        label: 'PATCH /:rescueId',
        method: 'patch',
        path: id => `/api/v1/rescues/${id}`,
        body: { name: 'New Name' },
      },
      {
        label: 'DELETE /:rescueId',
        method: 'delete',
        path: id => `/api/v1/rescues/${id}`,
        body: { reason: 'gone' },
      },
      {
        label: 'GET /:rescueId/staff',
        method: 'get',
        path: id => `/api/v1/rescues/${id}/staff`,
      },
      {
        label: 'POST /:rescueId/staff',
        method: 'post',
        path: id => `/api/v1/rescues/${id}/staff`,
        body: { userId: 'u1' },
      },
      {
        label: 'GET /:rescueId/invitations',
        method: 'get',
        path: id => `/api/v1/rescues/${id}/invitations`,
      },
      {
        label: 'PUT /:rescueId/adoption-policies',
        method: 'put',
        path: id => `/api/v1/rescues/${id}/adoption-policies`,
        body: { policies: [] },
      },
      {
        label: 'POST /:rescueId/send-email',
        method: 'post',
        path: id => `/api/v1/rescues/${id}/send-email`,
        body: { body: 'hi' },
      },
    ];

    const crossTenantOnlyEndpoints: ReadonlyArray<TenantEndpoint> = [
      ...tenantScopedEndpoints,
      {
        label: 'GET /:rescueId/analytics',
        method: 'get',
        path: id => `/api/v1/rescues/${id}/analytics`,
      },
    ];

    it.each(crossTenantOnlyEndpoints)(
      'rejects cross-tenant $label with 403 and does not invoke the service',
      async ({ method, path, body }) => {
        const { RescueService } = await import('../../services/rescue.service');
        const app = buildAppAsUser(staffOfRescueA);

        const req = request(app)[method](path(otherRescueId));
        const res = await (body ? req.send(body) : req.send());

        expect(res.status).toBe(403);
        // Service must not be invoked when tenant guard rejects — verifies
        // no data leak / no side effects from the spoofed call.
        Object.values(RescueService).forEach(fn => {
          if (typeof fn === 'function' && 'mock' in fn) {
            expect(fn).not.toHaveBeenCalled();
          }
        });
      }
    );

    it.each(tenantScopedEndpoints)(
      'allows same-tenant $label through the tenant guard',
      async ({ method, path, body }) => {
        const app = buildAppAsUser(staffOfRescueA);
        const req = request(app)[method](path(rescueId));
        const res = await (body ? req.send(body) : req.send());

        // Past the tenant guard — anything beyond is downstream concern.
        expect(res.status).not.toBe(401);
        // A 403 here would mean the tenant guard rejected — which it shouldn't.
        expect(res.status).not.toBe(403);
      }
    );

    it('allows platform admin to act cross-tenant', async () => {
      const app = buildAppAsUser(mockAdminUser);
      const res = await request(app)
        .put(`/api/v1/rescues/${otherRescueId}`)
        .send({ name: 'Admin Edit' });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation(
        (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
          res.status(401).json({ error: 'Authentication required' });
        }
      );

      const res = await request(buildApp())
        .put(`/api/v1/rescues/${otherRescueId}`)
        .send({ name: 'Anon Edit' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/rescues/:rescueId/activity (EntityInspector activity tab)', () => {
    it('returns 422 when rescueId is not a valid UUID', async () => {
      const res = await request(buildApp()).get('/api/v1/rescues/not-a-uuid/activity');
      expect(res.status).toBe(422);
    });

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation(
        (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
          res.status(401).json({ error: 'Authentication required' });
        }
      );

      const res = await request(buildApp()).get(`/api/v1/rescues/${rescueId}/activity`);
      expect(res.status).toBe(401);
    });

    it('returns 403 when caller lacks rescues.read permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp()).get(`/api/v1/rescues/${rescueId}/activity`);
      expect(res.status).toBe(403);
    });

    it('reaches the controller when properly authorised', async () => {
      const res = await request(buildApp()).get(`/api/v1/rescues/${rescueId}/activity`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(422);
    });
  });
});
