import { vi, describe, beforeEach, it, expect } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn(), logPerformance: vi.fn() },
}));

vi.mock('../../services/supportTicket.service', () => ({
  default: {
    getTicketActivityLog: vi.fn(),
    getTicketById: vi.fn(),
    getTickets: vi.fn(),
    createTicket: vi.fn(),
    updateTicket: vi.fn(),
    assignTicket: vi.fn(),
    addResponse: vi.fn(),
    escalateTicket: vi.fn(),
    getTicketStats: vi.fn(),
    getAgentTickets: vi.fn(),
  },
}));

vi.mock('../../services/rich-text-processing.service', () => ({
  RichTextProcessingService: { sanitize: (s: string) => s },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/zod-validate', () => ({
  validateBody:
    () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
}));

const authenticateTokenMock = vi.fn();
const requirePermissionMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission:
    (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionMock(perm, req, res, next),
}));

import supportTicketRoutes from '../../routes/supportTicket.routes';
import supportTicketService from '../../services/supportTicket.service';

const MockedService = supportTicketService as unknown as {
  getTicketActivityLog: ReturnType<typeof vi.fn>;
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/admin/support', supportTicketRoutes);
  return app;
};

describe('GET /api/v1/admin/support/tickets/:ticketId/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = { userId: 'admin-1' } as AuthenticatedRequest['user'];
        next();
      }
    );
    requirePermissionMock.mockImplementation(
      (_perm: string, _req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  it('returns 401 when unauthenticated', async () => {
    authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
      res.status(401).json({ error: 'Access token required' });
    });

    const res = await request(buildApp()).get(
      '/api/v1/admin/support/tickets/ticket-001/activity'
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when the SUPPORT_TICKET_READ permission is denied', async () => {
    requirePermissionMock.mockImplementation((_perm, _req, res: Response) => {
      res.status(403).json({ error: 'Forbidden' });
    });

    const res = await request(buildApp()).get(
      '/api/v1/admin/support/tickets/ticket-001/activity'
    );
    expect(res.status).toBe(403);
  });

  it('delegates to the service and returns its activity in {success, data}', async () => {
    const activity = [
      {
        activityId: 1,
        activityType: 'other',
        action: 'UPDATE',
        description: 'Updated support ticket',
        category: 'support_ticket',
        ipAddress: null,
        userAgent: null,
        createdAt: '2024-02-01T10:00:00.000Z',
      },
    ];
    MockedService.getTicketActivityLog.mockResolvedValue(activity);

    const res = await request(buildApp())
      .get('/api/v1/admin/support/tickets/ticket-001/activity')
      .query({ limit: 10, offset: 0 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: activity });
    expect(MockedService.getTicketActivityLog).toHaveBeenCalledWith(
      'ticket-001',
      expect.objectContaining({ limit: 10, offset: 0 })
    );
  });

  it('forwards from/to query params as strings to the service', async () => {
    MockedService.getTicketActivityLog.mockResolvedValue([]);

    const res = await request(buildApp())
      .get('/api/v1/admin/support/tickets/ticket-001/activity')
      .query({ from: '2024-01-01T00:00:00Z', to: '2024-02-01T00:00:00Z' });

    expect(res.status).toBe(200);
    expect(MockedService.getTicketActivityLog).toHaveBeenCalledWith(
      'ticket-001',
      expect.objectContaining({
        from: '2024-01-01T00:00:00Z',
        to: '2024-02-01T00:00:00Z',
      })
    );
  });
});
