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

vi.mock('../../services/gdpr.service', () => ({
  default: {
    exportUserData: vi.fn(),
    requestErasure: vi.fn(),
  },
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

import GdprService from '../../services/gdpr.service';
import privacyRouter from '../../routes/privacy.routes';

const mockedExport = vi.mocked(GdprService.exportUserData);
const mockedDelete = vi.mocked(GdprService.requestErasure);

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
      pendingAnonymizationAt: new Date(),
      refreshTokensRevoked: 0,
      deviceTokensCleared: 0,
    } as never);
  });

  describe('GET /admin/users/:userId/export', () => {
    it('allows ADMIN', async () => {
      authenticateAs({ userId: 'admin-1', userType: UserType.ADMIN });
      const res = await request(buildApp()).get('/api/v1/privacy/admin/users/u-1/export');
      expect(res.status).toBe(200);
      expect(mockedExport).toHaveBeenCalledWith('u-1');
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
      expect(mockedDelete).toHaveBeenCalledWith('u-1', {
        reason: 'GDPR request',
        actorUserId: 'admin-1',
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

describe('POST /me/delete — auth cookie clearing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDelete.mockResolvedValue({
      userId: 'data-subject',
      pendingAnonymizationAt: new Date(),
      refreshTokensRevoked: 0,
      deviceTokensCleared: 0,
    } as never);
  });

  // The original bug: `res.clearCookie('accessToken')` was called with no
  // options, so the resulting Set-Cookie header omitted SameSite/HttpOnly
  // and the browser refused to honour the deletion. The clear header must
  // mirror the options used when the cookie was originally set.
  it('clears both accessToken and refreshToken with matching cookie options', async () => {
    authenticateAs({ userId: 'adopter-1', userType: UserType.ADOPTER });
    const res = await request(buildApp())
      .post('/api/v1/privacy/me/delete')
      .send({ reason: 'no longer needed' });

    expect(res.status).toBe(202);

    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

    const accessCookie = cookies.find(c => c.startsWith('accessToken='));
    const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));

    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();

    // Each cleared cookie must carry HttpOnly, SameSite=Strict, Path=/,
    // and an expired/zero-age marker so the browser actually drops it.
    for (const cookie of [accessCookie!, refreshCookie!]) {
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
      expect(cookie).toMatch(/Path=\//i);
      expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
    }
  });

  // Frontend depends on these response keys — guard against future
  // refactors of the GdprService return shape silently breaking it.
  it('returns a body containing userId, softDeletedAt, and the user-facing message', async () => {
    authenticateAs({ userId: 'adopter-1', userType: UserType.ADOPTER });
    const res = await request(buildApp())
      .post('/api/v1/privacy/me/delete')
      .send({ reason: 'no longer needed' });

    expect(res.status).toBe(202);
    expect(res.body.data).toMatchObject({
      userId: 'data-subject',
      message: expect.stringMatching(/scheduled for deletion/i),
    });
    expect(typeof res.body.data.softDeletedAt).toBe('string');
  });
});

describe('GET /me/export — auto-fix from data-export.service migration', () => {
  it('includes sentMessages in the bundle (data-export.service did not — GdprService does)', async () => {
    // The wired GdprService.exportUserData is mocked here so the route
    // test verifies that the route hands back whatever shape the
    // service produces. The companion gdpr.service.test.ts asserts
    // the real bundle contents include `messages`.
    mockedExport.mockResolvedValueOnce({
      user: { userId: 'self' },
      messages: [{ message_id: 'msg-1', content: 'hi' }],
    } as never);

    authenticateAs({ userId: 'self', userType: UserType.ADOPTER });
    const res = await request(buildApp()).get('/api/v1/privacy/me/export');

    expect(res.status).toBe(200);
    expect(res.body.messages).toEqual([{ message_id: 'msg-1', content: 'hi' }]);
  });
});
