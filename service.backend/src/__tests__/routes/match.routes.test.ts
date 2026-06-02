import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedRequest } from '../../types';

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

const { upsertMock, findByPkMock, authenticateTokenMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  findByPkMock: vi.fn(),
  authenticateTokenMock: vi.fn(),
}));

vi.mock('../../models/AdopterMatchProfile', () => {
  const MockModel = {
    upsert: upsertMock,
    findByPk: findByPkMock,
    findAll: vi.fn().mockResolvedValue([]),
  };
  return { default: MockModel };
});

vi.mock('../../models/Pet', () => {
  const PetStatus = { AVAILABLE: 'available' };
  const MockPet = { findAll: vi.fn().mockResolvedValue([]) };
  return { default: MockPet, PetStatus };
});

vi.mock('../../models/PetMedia', () => {
  const PetMediaType = { IMAGE: 'image' };
  return { default: {}, PetMediaType };
});

vi.mock('../../models/Rescue', () => ({ default: {} }));
vi.mock('../../models/Breed', () => ({ default: {} }));

vi.mock('../../matching', () => ({
  matchService: {
    isEnabled: vi.fn().mockReturnValue(false),
    rankPets: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../sequelize', () => ({
  default: { query: vi.fn() },
  getUuidType: () => 'UUID',
}));

vi.mock('../../models/audit-columns', () => ({
  auditColumns: {},
  auditIndexes: () => [],
  withAuditHooks: (opts: Record<string, unknown>) => opts,
}));

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    authenticateTokenMock(req, _res, next),
}));

import matchRoutes from '../../routes/match.routes';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/match', matchRoutes);
  return app;
};

describe('PUT /api/v1/match/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = { userId: 'user-1' } as AuthenticatedRequest['user'];
        next();
      }
    );
    upsertMock.mockResolvedValue([{ toJSON: () => ({ user_id: 'user-1' }) }, true]);
  });

  it('accepts allergies field in the request body', async () => {
    const app = buildApp();

    const response = await request(app)
      .put('/api/v1/match/profile')
      .send({
        allergies: 'cats',
        preferred_types: ['dog'],
      });

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    const payload = upsertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.allergies).toBe('cats');
    expect(payload.preferred_types).toEqual(['dog']);
  });

  it('accepts null allergies', async () => {
    const app = buildApp();

    const response = await request(app).put('/api/v1/match/profile').send({
      allergies: null,
    });

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    const payload = upsertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.allergies).toBeNull();
  });

  it('works without allergies field (backward compatibility)', async () => {
    const app = buildApp();

    const response = await request(app)
      .put('/api/v1/match/profile')
      .send({
        preferred_types: ['cat'],
        lifestyle: { has_children: true },
      });

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    const payload = upsertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('allergies');
    expect(payload.preferred_types).toEqual(['cat']);
    expect(payload.lifestyle).toEqual({ has_children: true });
  });

  it('rejects non-string allergies value', async () => {
    const app = buildApp();

    const response = await request(app).put('/api/v1/match/profile').send({
      allergies: 123,
    });

    // ADS-784: validation errors now use the canonical 422 `details` envelope.
    expect(response.status).toBe(422);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
