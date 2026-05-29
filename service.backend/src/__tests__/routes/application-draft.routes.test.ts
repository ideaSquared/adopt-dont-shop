import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../../types/auth';

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

vi.mock('../../services/application-draft.service', () => ({
  default: {
    getDraft: vi.fn(),
    upsertDraft: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));

const authenticateTokenMock = vi.fn();
vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import applicationDraftService from '../../services/application-draft.service';
import draftRouter from '../../routes/application-draft.routes';

const mockedGet = vi.mocked(applicationDraftService.getDraft);
const mockedPut = vi.mocked(applicationDraftService.upsertDraft);
const mockedDelete = vi.mocked(applicationDraftService.deleteDraft);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/applications/drafts', draftRouter);
  return app;
};

const authenticateAs = (userId: string | null): void => {
  authenticateTokenMock.mockImplementation(
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (userId === null) {
        return res.status(401).json({ error: 'unauthenticated' });
      }
      req.user = { userId } as AuthenticatedRequest['user'];
      next();
    }
  );
};

const PET_ID = 'e5a17a44-26b5-4e3c-9b3f-44e2c0d6b66b';

describe('Application draft routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/applications/drafts/:petId', () => {
    it('returns 404 when the caller has no draft', async () => {
      authenticateAs('user-1');
      mockedGet.mockResolvedValue(null);

      const res = await request(buildApp()).get(`/api/v1/applications/drafts/${PET_ID}`);

      expect(res.status).toBe(404);
      expect(mockedGet).toHaveBeenCalledWith('user-1', PET_ID);
    });

    it('returns the draft for the authenticated caller', async () => {
      authenticateAs('user-1');
      const now = new Date('2024-01-15T10:00:00Z');
      mockedGet.mockResolvedValue({
        draftId: 'd-1',
        userId: 'user-1',
        petId: PET_ID,
        answers: { name: 'Sam' },
        expiresAt: new Date('2024-02-15T10:00:00Z'),
        createdAt: now,
        updatedAt: now,
      });

      const res = await request(buildApp()).get(`/api/v1/applications/drafts/${PET_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ petId: PET_ID, answers: { name: 'Sam' } });
    });

    it('rejects unauthenticated callers without invoking the service', async () => {
      authenticateAs(null);

      const res = await request(buildApp()).get(`/api/v1/applications/drafts/${PET_ID}`);

      expect(res.status).toBe(401);
      expect(mockedGet).not.toHaveBeenCalled();
    });

    it("scopes the lookup to the caller's userId", async () => {
      authenticateAs('user-a');
      mockedGet.mockResolvedValue(null);

      await request(buildApp()).get(`/api/v1/applications/drafts/${PET_ID}`);

      expect(mockedGet).toHaveBeenCalledWith('user-a', PET_ID);
    });
  });

  describe('PUT /api/v1/applications/drafts/:petId', () => {
    it('upserts the draft and returns it', async () => {
      authenticateAs('user-1');
      mockedPut.mockResolvedValue({
        draftId: 'd-1',
        userId: 'user-1',
        petId: PET_ID,
        answers: { step: 1 },
        expiresAt: new Date('2024-02-15T10:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(buildApp())
        .put(`/api/v1/applications/drafts/${PET_ID}`)
        .send({ answers: { step: 1 } });

      expect(res.status).toBe(200);
      expect(mockedPut).toHaveBeenCalledWith('user-1', PET_ID, { step: 1 });
      expect(res.body.data.answers).toEqual({ step: 1 });
    });

    it('rejects a body whose answers field is missing or wrong-shape', async () => {
      authenticateAs('user-1');

      const res = await request(buildApp())
        .put(`/api/v1/applications/drafts/${PET_ID}`)
        .send({ answers: 'not-an-object' });

      expect(res.status).toBe(422);
      expect(mockedPut).not.toHaveBeenCalled();
    });

    it('always scopes the upsert to the caller', async () => {
      authenticateAs('user-from-jwt');
      mockedPut.mockResolvedValue({
        draftId: 'd',
        userId: 'user-from-jwt',
        petId: PET_ID,
        answers: {},
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await request(buildApp())
        .put(`/api/v1/applications/drafts/${PET_ID}`)
        // The route must ignore any userId snuck into the body — only the
        // JWT-derived userId is passed to the service.
        .send({ answers: {}, userId: 'somebody-else' });

      expect(mockedPut).toHaveBeenCalledWith('user-from-jwt', PET_ID, {});
    });
  });

  describe('DELETE /api/v1/applications/drafts/:petId', () => {
    it('returns 204 when the draft is deleted', async () => {
      authenticateAs('user-1');
      mockedDelete.mockResolvedValue(true);

      const res = await request(buildApp()).delete(`/api/v1/applications/drafts/${PET_ID}`);

      expect(res.status).toBe(204);
      expect(mockedDelete).toHaveBeenCalledWith('user-1', PET_ID);
    });

    it('returns 204 even when there was nothing to delete (idempotent)', async () => {
      authenticateAs('user-1');
      mockedDelete.mockResolvedValue(false);

      const res = await request(buildApp()).delete(`/api/v1/applications/drafts/${PET_ID}`);

      expect(res.status).toBe(204);
    });
  });
});
