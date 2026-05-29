import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn() },
}));

// Run the router body in development so the seeded-users handler executes
// (rather than 404ing on the inner dev-only guard) — that lets us assert the
// auth chain is enforced even on the most permissive environment.
vi.mock('../../config', () => ({
  config: {
    nodeEnv: 'development',
    rateLimit: { windowMs: 900000, maxRequests: 100 },
  },
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
}));

// Rate limiters are pass-through in these tests.
vi.mock('../../middleware/rate-limiter', () => ({
  apiLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  uploadLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const findAllMock = vi.fn();
vi.mock('../../models/User', () => ({
  default: { findAll: (...args: unknown[]) => findAllMock(...args) },
}));

import monitoringRouter from '../../routes/monitoring.routes';

const buildApp = () => {
  const app = express();
  app.use('/monitoring', monitoringRouter);
  return app;
};

describe('Monitoring routes - seeded-users PII endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findAllMock.mockResolvedValue([]);
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = { userId: 'admin-1' } as AuthenticatedRequest['user'];
        next();
      }
    );
    requireAdminMock.mockImplementation(
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  it('requires authentication before serving user PII', async () => {
    authenticateTokenMock.mockImplementation((_req, res: Response) => {
      res.status(401).json({ error: 'Access token required' });
    });

    const res = await request(buildApp()).get('/monitoring/api/dev/seeded-users');

    expect(res.status).toBe(401);
    expect(authenticateTokenMock).toHaveBeenCalled();
    expect(findAllMock).not.toHaveBeenCalled();
  });

  it('requires admin authorization before serving user PII', async () => {
    requireAdminMock.mockImplementation((_req, res: Response) => {
      res.status(403).json({ error: 'Access denied' });
    });

    const res = await request(buildApp()).get('/monitoring/api/dev/seeded-users');

    expect(res.status).toBe(403);
    expect(requireAdminMock).toHaveBeenCalled();
    expect(findAllMock).not.toHaveBeenCalled();
  });

  it('serves seeded users to an authenticated admin', async () => {
    const res = await request(buildApp()).get('/monitoring/api/dev/seeded-users');

    expect(res.status).toBe(200);
    expect(authenticateTokenMock).toHaveBeenCalled();
    expect(requireAdminMock).toHaveBeenCalled();
    expect(findAllMock).toHaveBeenCalled();
    expect(res.body.source).toBe('database');
  });
});
