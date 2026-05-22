/**
 * Behaviour coverage for the user-facing session routes:
 *   - GET /api/v1/sessions returns the caller's own active sessions;
 *   - DELETE /api/v1/sessions/:sessionId revokes one belonging to the
 *     caller; missing auth → 401; another user's session → 404 (does
 *     not reveal whether the id exists for someone else).
 */

import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../../types/auth';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn(), logBusiness: vi.fn() },
}));

vi.mock('../../models/RefreshToken', () => ({
  default: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../../services/security.service', () => ({
  default: {
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
  },
}));

const authenticateTokenMock = vi.fn();
vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import RefreshToken from '../../models/RefreshToken';
import sessionRouter from '../../routes/session.routes';
import SecurityService from '../../services/security.service';

const mockedRefreshToken = RefreshToken as unknown as {
  findByPk: ReturnType<typeof vi.fn>;
};
const mockedSecurityService = SecurityService as unknown as {
  listSessions: ReturnType<typeof vi.fn>;
  revokeSession: ReturnType<typeof vi.fn>;
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/sessions', sessionRouter);
  return app;
};

const authenticateAs = (userId: string): void => {
  authenticateTokenMock.mockImplementation(
    (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      req.user = { userId, userType: 'adopter' } as AuthenticatedRequest['user'];
      next();
    }
  );
};

const denyAuth = (): void => {
  authenticateTokenMock.mockImplementation(
    (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
      res.status(401).json({ error: 'Authentication required' });
    }
  );
};

describe('GET /api/v1/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the caller’s active sessions only', async () => {
    authenticateAs('user-1');
    mockedSecurityService.listSessions.mockResolvedValue({
      sessions: [
        {
          sessionId: 'sess-1',
          userId: 'user-1',
          familyId: 'fam-1',
          isRevoked: false,
          expiresAt: new Date('2026-12-31'),
          createdAt: new Date('2026-01-01'),
          user: null,
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const res = await request(buildApp()).get('/api/v1/sessions');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].sessionId).toBe('sess-1');
    expect(mockedSecurityService.listSessions).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  it('returns 401 when not authenticated', async () => {
    denyAuth();
    const res = await request(buildApp()).get('/api/v1/sessions');
    expect(res.status).toBe(401);
    expect(mockedSecurityService.listSessions).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/sessions/:sessionId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revokes a session owned by the caller', async () => {
    authenticateAs('user-1');
    mockedRefreshToken.findByPk.mockResolvedValue({
      token_id: 'sess-1',
      user_id: 'user-1',
    });
    mockedSecurityService.revokeSession.mockResolvedValue({ userId: 'user-1' });

    const res = await request(buildApp()).delete('/api/v1/sessions/sess-1');

    expect(res.status).toBe(204);
    expect(mockedSecurityService.revokeSession).toHaveBeenCalledWith('sess-1', 'user-1');
  });

  it('returns 401 when not authenticated', async () => {
    denyAuth();
    const res = await request(buildApp()).delete('/api/v1/sessions/sess-1');
    expect(res.status).toBe(401);
    expect(mockedSecurityService.revokeSession).not.toHaveBeenCalled();
  });

  it('returns 404 when the session belongs to another user (no cross-user revoke)', async () => {
    authenticateAs('user-1');
    mockedRefreshToken.findByPk.mockResolvedValue({
      token_id: 'sess-2',
      user_id: 'user-2',
    });

    const res = await request(buildApp()).delete('/api/v1/sessions/sess-2');

    expect(res.status).toBe(404);
    expect(mockedSecurityService.revokeSession).not.toHaveBeenCalled();
  });

  it('returns 404 when the session does not exist', async () => {
    authenticateAs('user-1');
    mockedRefreshToken.findByPk.mockResolvedValue(null);

    const res = await request(buildApp()).delete('/api/v1/sessions/missing');

    expect(res.status).toBe(404);
    expect(mockedSecurityService.revokeSession).not.toHaveBeenCalled();
  });
});
