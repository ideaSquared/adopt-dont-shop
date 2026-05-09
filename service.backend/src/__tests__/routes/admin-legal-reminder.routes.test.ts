/**
 * ADS-497 (slice 3): HTTP-contract tests for the admin-triggered legal
 * re-acceptance reminder endpoint. Service-level behaviour (dedupe,
 * rate-limit, missing-email) is covered in legal-reminder.test.ts;
 * these tests cover auth gating, body validation, and error mapping.
 */
import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

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
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../services/admin.service', () => ({
  default: {},
}));

vi.mock('../../services/security.service', () => ({
  default: {},
}));

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { create: vi.fn(), getAuditLogs: vi.fn(), log: vi.fn() },
}));

vi.mock('../../services/legal-reminder.service', () => ({
  sendReacceptanceReminder: vi.fn(),
}));

const authenticateTokenMock = vi.fn();
const requireAdminMock = vi.fn();
const requirePermissionMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    requireAdminMock(req, res, next),
  requirePermission:
    (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionMock(perm, req, res, next),
  requireRole:
    (..._roles: string[]) =>
    (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
}));

import adminRouter from '../../routes/admin.routes';
import { sendReacceptanceReminder } from '../../services/legal-reminder.service';

const mockSend = vi.mocked(sendReacceptanceReminder);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/admin', adminRouter);
  return app;
};

const mockAdminUser = {
  userId: '827d8a69-a4a4-45a0-8dab-a5fc5ca89067',
  email: 'admin@example.com',
  userType: 'ADMIN',
  role: 'ADMIN',
};

const targetUserId = '5e3a0eaa-79b1-4c46-b5b6-26f1a8b1c9a2';

describe('POST /api/v1/admin/legal/send-reacceptance-reminder', () => {
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
    requirePermissionMock.mockImplementation(
      (_perm: string, _req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  it('returns 401 when unauthenticated', async () => {
    authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
      res.status(401).json({ error: 'Access token required' });
    });

    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({ userId: targetUserId });

    expect(res.status).toBe(401);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated user is not an admin', async () => {
    requireAdminMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
      res.status(403).json({ error: 'Access denied' });
    });

    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({ userId: targetUserId });

    expect(res.status).toBe(403);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 422 when userId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({});

    expect(res.status).toBe(422);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 422 when userId is not a UUID', async () => {
    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({ userId: 'not-a-uuid' });

    expect(res.status).toBe(422);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 200 with sent=true when the service queues an email', async () => {
    mockSend.mockResolvedValue({
      sent: true,
      versions: [{ documentType: 'terms', currentVersion: '2026-05-08-v1' }],
    });

    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({ userId: targetUserId });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      sent: true,
      versions: [{ documentType: 'terms', currentVersion: '2026-05-08-v1' }],
    });
    expect(mockSend).toHaveBeenCalledWith({
      userId: targetUserId,
      triggeredBy: mockAdminUser.userId,
    });
  });

  it('returns 200 with sent=false when the user is already up to date', async () => {
    mockSend.mockResolvedValue({ sent: false, reason: 'no_pending_versions' });

    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({ userId: targetUserId });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: false, reason: 'no_pending_versions' });
  });

  it('returns 200 with sent=false when rate-limited', async () => {
    mockSend.mockResolvedValue({ sent: false, reason: 'rate_limited' });

    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({ userId: targetUserId });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: false, reason: 'rate_limited' });
  });

  it('returns 404 when the target user does not exist', async () => {
    mockSend.mockRejectedValue(new Error('User not found'));

    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({ userId: targetUserId });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  it('returns 422 when the target user has no email on file', async () => {
    mockSend.mockRejectedValue(new Error('User has no email address on file'));

    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({ userId: targetUserId });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'User has no email address on file' });
  });

  it('returns 500 on unexpected service errors', async () => {
    mockSend.mockRejectedValue(new Error('db down'));

    const res = await request(buildApp())
      .post('/api/v1/admin/legal/send-reacceptance-reminder')
      .send({ userId: targetUserId });

    expect(res.status).toBe(500);
  });
});
