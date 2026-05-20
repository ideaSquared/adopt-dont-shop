/**
 * ADS-606: GET /foster/placements must not leak placements across rescues.
 *
 * Non-admin callers whose JWT does not carry a `rescueId` previously fell
 * through to an unscoped service call (filter.rescueId === undefined skips
 * the WHERE clause), exposing every rescue's placements. The route now
 * rejects those callers with 403 before invoking the service.
 *
 * The other route handlers (POST /placements, GET /placements/:id,
 * POST /placements/:id/end) already enforce scope per-record via
 * `rescueScopeOrAdmin` and are out of scope here.
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

vi.mock('../../services/foster.service', () => ({
  default: {
    list: vi.fn(),
    createPlacement: vi.fn(),
    endPlacement: vi.fn(),
    getById: vi.fn(),
  },
}));

const authenticateTokenMock = vi.fn();
vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import fosterService from '../../services/foster.service';
import fosterRouter from '../../routes/foster.routes';

const mockedList = vi.mocked(fosterService.list);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/foster', fosterRouter);
  return app;
};

type StubUser = Pick<NonNullable<AuthenticatedRequest['user']>, 'userId' | 'userType'> & {
  rescueId?: string | null;
};

const authenticateAs = (user: StubUser): void => {
  authenticateTokenMock.mockImplementation(
    (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      req.user = user as AuthenticatedRequest['user'];
      next();
    }
  );
};

describe('GET /api/v1/foster/placements scope enforcement (ADS-606)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue([]);
  });

  it('forbids a non-admin caller whose JWT carries no rescueId', async () => {
    authenticateAs({
      userId: 'user-no-rescue',
      userType: UserType.RESCUE_STAFF,
      rescueId: null,
    });

    const res = await request(buildApp()).get('/api/v1/foster/placements');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'No rescue scope' });
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('forbids a support agent whose JWT carries no rescueId', async () => {
    authenticateAs({
      userId: 'support-1',
      userType: UserType.SUPPORT_AGENT,
      rescueId: undefined,
    });

    const res = await request(buildApp()).get('/api/v1/foster/placements');

    expect(res.status).toBe(403);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('scopes a non-admin caller to their own rescue and ignores any rescueId query override', async () => {
    const callerRescueId = '1ece75b7-956f-420f-8538-91f89b00b30a';
    const otherRescueId = '7bdeed6e-6e22-4b8d-93c4-8a03f46a9910';
    authenticateAs({
      userId: 'staff-1',
      userType: UserType.RESCUE_STAFF,
      rescueId: callerRescueId,
    });

    const res = await request(buildApp())
      .get('/api/v1/foster/placements')
      .query({ rescueId: otherRescueId });

    expect(res.status).toBe(200);
    expect(mockedList).toHaveBeenCalledTimes(1);
    expect(mockedList).toHaveBeenCalledWith({
      rescueId: callerRescueId,
      fosterUserId: undefined,
      status: undefined,
    });
  });

  it('lets an admin list across rescues when no rescueId query is supplied', async () => {
    authenticateAs({
      userId: 'admin-1',
      userType: UserType.ADMIN,
      rescueId: null,
    });

    const res = await request(buildApp()).get('/api/v1/foster/placements');

    expect(res.status).toBe(200);
    expect(mockedList).toHaveBeenCalledTimes(1);
    expect(mockedList).toHaveBeenCalledWith({
      rescueId: undefined,
      fosterUserId: undefined,
      status: undefined,
    });
  });

  it('honours the admin-supplied rescueId query parameter', async () => {
    const adminTargetRescueId = '8b550c74-f893-4514-bcec-3ff61d22193d';
    authenticateAs({
      userId: 'admin-1',
      userType: UserType.SUPER_ADMIN,
      rescueId: null,
    });

    const res = await request(buildApp())
      .get('/api/v1/foster/placements')
      .query({ rescueId: adminTargetRescueId });

    expect(res.status).toBe(200);
    expect(mockedList).toHaveBeenCalledWith({
      rescueId: adminTargetRescueId,
      fosterUserId: undefined,
      status: undefined,
    });
  });
});
