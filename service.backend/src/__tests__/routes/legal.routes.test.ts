/**
 * ADS-497 (slice 1): route-level behaviour for the pending re-acceptance
 * endpoint. The legal-content service has its own behaviour tests for the
 * detection logic; these tests cover the HTTP contract — auth gating,
 * response shape, and error mapping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types/api';

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

vi.mock('../../services/legal-content.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/legal-content.service')>(
    '../../services/legal-content.service'
  );
  return {
    ...actual,
    getPendingReacceptance: vi.fn(),
  };
});

const authenticateTokenMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import legalRouter from '../../routes/legal.routes';
import { getPendingReacceptance } from '../../services/legal-content.service';

const mockGetPending = vi.mocked(getPendingReacceptance);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/legal', legalRouter);
  return app;
};

const mockUser = { userId: 'user-1', email: 'user@example.com' };

describe('GET /api/v1/legal/pending-reacceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );
  });

  it('returns 401 when the request is unauthenticated', async () => {
    authenticateTokenMock.mockImplementation((_req, res: Response) => {
      res.status(401).json({ error: 'Access token required' });
    });

    const res = await request(buildApp()).get('/api/v1/legal/pending-reacceptance');

    expect(res.status).toBe(401);
    expect(mockGetPending).not.toHaveBeenCalled();
  });

  it('returns the full pending list for a user with no prior acceptance', async () => {
    mockGetPending.mockResolvedValue({
      pending: [
        {
          documentType: 'terms',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
        {
          documentType: 'privacy',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
      ],
    });

    const res = await request(buildApp()).get('/api/v1/legal/pending-reacceptance');

    expect(res.status).toBe(200);
    expect(res.body.pending).toHaveLength(2);
    expect(mockGetPending).toHaveBeenCalledWith(mockUser.userId);
  });

  it('returns an empty pending array when the user is fully up to date', async () => {
    mockGetPending.mockResolvedValue({ pending: [] });

    const res = await request(buildApp()).get('/api/v1/legal/pending-reacceptance');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pending: [] });
  });

  it('returns only the stale document when the user accepted an older version', async () => {
    mockGetPending.mockResolvedValue({
      pending: [
        {
          documentType: 'terms',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: '2025-01-01-v1',
          lastAcceptedAt: '2025-02-01T00:00:00.000Z',
        },
      ],
    });

    const res = await request(buildApp()).get('/api/v1/legal/pending-reacceptance');

    expect(res.status).toBe(200);
    expect(res.body.pending).toEqual([
      {
        documentType: 'terms',
        currentVersion: '2026-05-08-v1',
        lastAcceptedVersion: '2025-01-01-v1',
        lastAcceptedAt: '2025-02-01T00:00:00.000Z',
      },
    ]);
  });

  it('returns 500 when the service throws', async () => {
    mockGetPending.mockRejectedValue(new Error('db down'));

    const res = await request(buildApp()).get('/api/v1/legal/pending-reacceptance');

    expect(res.status).toBe(500);
  });
});
