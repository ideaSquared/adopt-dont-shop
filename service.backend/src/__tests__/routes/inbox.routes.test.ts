import { vi, describe, it, expect, beforeEach } from 'vitest';
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
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

const mockGetInboxItems = vi.fn();
const mockAssignInboxItem = vi.fn();

// Mock the entire service module before it tries to import Sequelize models
vi.mock('../../services/inbox.service', async () => {
  const { z } = await import('zod');

  const InboxSourceSchema = z.enum(['moderation', 'support', 'message']);
  const InboxFiltersSchema = z.object({
    source: InboxSourceSchema.optional(),
    status: z.string().optional(),
    assignedTo: z.string().optional(),
    severity: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  });

  return {
    getInboxItems: (...args: unknown[]) => mockGetInboxItems(...args),
    assignInboxItem: (...args: unknown[]) => mockAssignInboxItem(...args),
    InboxFiltersSchema,
    InboxSourceSchema,
  };
});

vi.mock('../../middleware/rate-limiter', () => ({
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();
const requireAdminMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    requireAdminMock(req, res, next),
  requirePermission:
    () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
}));

import inboxRouter from '../../routes/inbox.routes';

const mockAdminUser = {
  userId: 'admin-uuid-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  userType: 'ADMIN',
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/admin/inbox', inboxRouter);
  return app;
};

describe('Inbox routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockAdminUser as AuthenticatedRequest['user'];
        next();
      }
    );
    requireAdminMock.mockImplementation(
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  describe('GET /api/v1/admin/inbox', () => {
    it('returns normalized items from all three sources', async () => {
      const mockResponse = {
        data: [
          {
            id: 'report-1',
            source: 'moderation',
            title: 'Spam report',
            summary: 'User posted spam',
            status: 'pending',
            severity: 'high',
            assignedTo: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            relatedUserId: 'user-1',
            relatedUserEmail: null,
          },
          {
            id: 'ticket-1',
            source: 'support',
            title: 'Cannot login',
            summary: 'User cannot login',
            status: 'open',
            severity: 'medium',
            assignedTo: 'admin-1',
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            relatedUserId: 'user-2',
            relatedUserEmail: 'user2@test.com',
          },
          {
            id: 'chat-1',
            source: 'message',
            title: 'Chat #abc123',
            summary: 'active conversation',
            status: 'active',
            severity: 'medium',
            assignedTo: null,
            createdAt: '2026-01-03T00:00:00.000Z',
            updatedAt: '2026-01-03T00:00:00.000Z',
            relatedUserId: 'user-3',
            relatedUserEmail: 'user3@test.com',
          },
        ],
        pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
      };

      mockGetInboxItems.mockResolvedValue(mockResponse);

      const app = buildApp();
      const res = await request(app).get('/api/v1/admin/inbox');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].source).toBe('moderation');
      expect(res.body.data[1].source).toBe('support');
      expect(res.body.data[2].source).toBe('message');
      expect(res.body.pagination.total).toBe(3);
      expect(mockGetInboxItems).toHaveBeenCalledTimes(1);
    });

    it('passes query filters to the service', async () => {
      mockGetInboxItems.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const app = buildApp();
      await request(app).get(
        '/api/v1/admin/inbox?source=moderation&status=pending&severity=high&search=spam'
      );

      expect(mockGetInboxItems).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'moderation',
          status: 'pending',
          severity: 'high',
          search: 'spam',
        })
      );
    });

    it('returns 500 when the service throws', async () => {
      mockGetInboxItems.mockRejectedValue(new Error('DB connection failed'));

      const app = buildApp();
      const res = await request(app).get('/api/v1/admin/inbox');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });

    it('requires authentication', async () => {
      authenticateTokenMock.mockImplementation(
        (_req: AuthenticatedRequest, res: Response) => {
          res.status(401).json({ error: 'Access token required' });
        }
      );

      const app = buildApp();
      const res = await request(app).get('/api/v1/admin/inbox');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/admin/inbox/assign', () => {
    it('assigns an item and returns success', async () => {
      mockAssignInboxItem.mockResolvedValue(undefined);

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/admin/inbox/assign')
        .send({
          itemId: 'report-1',
          source: 'moderation',
          assignedTo: '00000000-0000-0000-0000-000000000001',
        });

      expect(res.body).toEqual(expect.objectContaining({ message: 'Item assigned successfully' }));
      expect(res.status).toBe(200);
      expect(mockAssignInboxItem).toHaveBeenCalledWith(
        'report-1',
        'moderation',
        '00000000-0000-0000-0000-000000000001'
      );
    });

    it('returns 400 for invalid request body', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/admin/inbox/assign')
        .send({ itemId: 'x' });

      expect(res.status).toBe(400);
    });

    it('returns 404 when item not found', async () => {
      mockAssignInboxItem.mockRejectedValue(new Error('Report not found'));

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/admin/inbox/assign')
        .send({
          itemId: 'nonexistent',
          source: 'moderation',
          assignedTo: '00000000-0000-0000-0000-000000000001',
        });

      expect(res.status).toBe(404);
    });
  });
});
