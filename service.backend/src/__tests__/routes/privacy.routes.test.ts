/**
 * ADS-610: admin GDPR routes go through `requireRole` instead of the
 * old inline `ensureAdmin` helper. These tests assert the admin-only
 * endpoints reject non-admin roles (notably `support_agent`, which the
 * inline string check would have ignored entirely) before invoking the
 * underlying service.
 */

import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../../types/auth';
import { UserType } from '../../models/User';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn(), logBusiness: vi.fn() },
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

vi.mock('../../services/data-export.service', () => ({
  exportUserData: vi.fn(),
}));

vi.mock('../../services/data-deletion.service', () => ({
  requestAccountDeletion: vi.fn(),
}));

vi.mock('../../services/consent.service', async () => {
  const { z } = await import('zod');
  return {
    ConsentInputSchema: z.object({}).passthrough(),
    CookiesConsentInputSchema: z.object({}).passthrough(),
    recordConsent: vi.fn(),
    recordCookiesConsent: vi.fn(),
  };
});

const authenticateTokenMock = vi.fn();
vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import { exportUserData } from '../../services/data-export.service';
import { requestAccountDeletion } from '../../services/data-deletion.service';
import privacyRouter from '../../routes/privacy.routes';

const mockedExport = vi.mocked(exportUserData);
const mockedDelete = vi.mocked(requestAccountDeletion);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/privacy', privacyRouter);
  return app;
};

type StubUser = Pick<NonNullable<AuthenticatedRequest['user']>, 'userId' | 'userType'>;

const authenticateAs = (user: StubUser): void => {
  authenticateTokenMock.mockImplementation(
    (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      req.user = user as AuthenticatedRequest['user'];
      next();
    }
  );
};

describe('Admin privacy endpoints — RBAC (ADS-610)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedExport.mockResolvedValue({ user: { userId: 'data-subject' } } as never);
    mockedDelete.mockResolvedValue({
      userId: 'data-subject',
      anonymisationScheduledFor: new Date().toISOString(),
    } as never);
  });

  describe('GET /admin/users/:userId/export', () => {
    it('allows ADMIN', async () => {
      authenticateAs({ userId: 'admin-1', userType: UserType.ADMIN });
      const res = await request(buildApp()).get('/api/v1/privacy/admin/users/u-1/export');
      expect(res.status).toBe(200);
      expect(mockedExport).toHaveBeenCalledWith('u-1', {
        userId: 'admin-1',
        userType: UserType.ADMIN,
      });
    });

    it('allows SUPER_ADMIN', async () => {
      authenticateAs({ userId: 'admin-2', userType: UserType.SUPER_ADMIN });
      const res = await request(buildApp()).get('/api/v1/privacy/admin/users/u-1/export');
      expect(res.status).toBe(200);
      expect(mockedExport).toHaveBeenCalled();
    });

    it('rejects SUPPORT_AGENT with 403', async () => {
      authenticateAs({ userId: 'support-1', userType: UserType.SUPPORT_AGENT });
      const res = await request(buildApp()).get('/api/v1/privacy/admin/users/u-1/export');
      expect(res.status).toBe(403);
      expect(mockedExport).not.toHaveBeenCalled();
    });

    it('rejects MODERATOR with 403', async () => {
      authenticateAs({ userId: 'mod-1', userType: UserType.MODERATOR });
      const res = await request(buildApp()).get('/api/v1/privacy/admin/users/u-1/export');
      expect(res.status).toBe(403);
      expect(mockedExport).not.toHaveBeenCalled();
    });

    it('rejects ADOPTER with 403', async () => {
      authenticateAs({ userId: 'adopter-1', userType: UserType.ADOPTER });
      const res = await request(buildApp()).get('/api/v1/privacy/admin/users/u-1/export');
      expect(res.status).toBe(403);
      expect(mockedExport).not.toHaveBeenCalled();
    });

    it('rejects RESCUE_STAFF with 403', async () => {
      authenticateAs({ userId: 'staff-1', userType: UserType.RESCUE_STAFF });
      const res = await request(buildApp()).get('/api/v1/privacy/admin/users/u-1/export');
      expect(res.status).toBe(403);
      expect(mockedExport).not.toHaveBeenCalled();
    });
  });

  describe('POST /admin/users/:userId/delete-request', () => {
    it('allows ADMIN', async () => {
      authenticateAs({ userId: 'admin-1', userType: UserType.ADMIN });
      const res = await request(buildApp())
        .post('/api/v1/privacy/admin/users/u-1/delete-request')
        .send({ reason: 'GDPR request' });
      expect(res.status).toBe(202);
      expect(mockedDelete).toHaveBeenCalledWith('u-1', 'GDPR request', {
        userId: 'admin-1',
        userType: UserType.ADMIN,
      });
    });

    it('rejects SUPPORT_AGENT with 403', async () => {
      authenticateAs({ userId: 'support-1', userType: UserType.SUPPORT_AGENT });
      const res = await request(buildApp())
        .post('/api/v1/privacy/admin/users/u-1/delete-request')
        .send({ reason: 'should be denied' });
      expect(res.status).toBe(403);
      expect(mockedDelete).not.toHaveBeenCalled();
    });

    it('rejects ADOPTER with 403', async () => {
      authenticateAs({ userId: 'adopter-1', userType: UserType.ADOPTER });
      const res = await request(buildApp())
        .post('/api/v1/privacy/admin/users/u-1/delete-request')
        .send({});
      expect(res.status).toBe(403);
      expect(mockedDelete).not.toHaveBeenCalled();
    });
  });
});
