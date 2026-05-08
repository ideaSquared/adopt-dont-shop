import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  loggerHelpers: { logSecurity: vi.fn() },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

vi.mock('../../services/pet.service', () => ({
  default: {
    searchPets: vi.fn(),
    getPetById: vi.fn(),
    createPet: vi.fn(),
    updatePet: vi.fn(),
    updatePetStatus: vi.fn(),
    deletePet: vi.fn(),
    getPetsByRescue: vi.fn(),
    getFeaturedPets: vi.fn(),
    getRecentPets: vi.fn(),
    getPetStatistics: vi.fn(),
    addToFavorites: vi.fn(),
    removeFromFavorites: vi.fn(),
    getUserFavorites: vi.fn(),
    getPets: vi.fn(),
    getVerifiedRescueIdForUser: vi.fn(),
    getVerifiedRescueIdsForUser: vi.fn(),
    getPetBreedsByType: vi.fn(),
    getSimilarPets: vi.fn(),
    getPetActivity: vi.fn(),
    bulkUpdatePets: vi.fn(),
    checkFavoriteStatus: vi.fn(),
    getPetTypes: vi.fn(),
  },
  PetService: {
    searchPets: vi.fn(),
    getPetById: vi.fn(),
    createPet: vi.fn(),
    updatePet: vi.fn(),
    deletePet: vi.fn(),
    getFeaturedPets: vi.fn(),
    getRecentPets: vi.fn(),
    getPetTypes: vi.fn(),
    getPetBreedsByType: vi.fn(),
  },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  sensitiveWriteLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/field-permissions', () => ({
  fieldMask: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  fieldWriteGuard: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();
const authenticateOptionalTokenMock = vi.fn();
const requirePermissionMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
  authenticateOptionalToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateOptionalTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission:
    (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionMock(perm, req, res, next),
  requireRole:
    (..._roles: string[]) =>
    (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
}));

import petRouter from '../../routes/pet.routes';

const mockRescueStaffUser = {
  userId: 'staff-uuid-1',
  email: 'staff@example.com',
  firstName: 'Staff',
  lastName: 'Member',
  userType: 'RESCUE_STAFF',
  Roles: [
    {
      Permissions: [
        { permissionName: 'pets.create' },
        { permissionName: 'pets.update' },
        { permissionName: 'pets.delete' },
      ],
    },
  ],
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/pets', petRouter);
  return app;
};

describe('Pet routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Optional auth: pass through without user by default (public browsing)
    authenticateOptionalTokenMock.mockImplementation(
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
    // Full auth: authenticated as rescue staff
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockRescueStaffUser as AuthenticatedRequest['user'];
        next();
      }
    );
    // Permission check: pass by default
    requirePermissionMock.mockImplementation(
      (_perm: string, _req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  describe('GET /api/v1/pets (public listing)', () => {
    it('allows unauthenticated access for browsing', async () => {
      // The route uses authenticateOptionalToken — unauthenticated requests
      // are allowed. Service may throw without a real DB but the route layer
      // should not block with 401/403.
      const res = await request(buildApp()).get('/api/v1/pets');
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('POST /api/v1/pets (create)', () => {
    const validBody = {
      name: 'Buddy',
      type: 'DOG',
      breed: 'Golden Retriever',
      age: 'ADULT',
      size: 'LARGE',
      gender: 'MALE',
      description: 'Friendly dog',
      status: 'available',
    };

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).post('/api/v1/pets').send(validBody);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks pets.create permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp()).post('/api/v1/pets').send(validBody);
      expect(res.status).toBe(403);
    });

    it('returns 422 when required fields are missing', async () => {
      // Only name is supplied — type, age, size, gender, description are all required
      const res = await request(buildApp()).post('/api/v1/pets').send({ name: 'Buddy' });

      expect(res.status).toBe(422);
    });
  });

  describe('PUT /api/v1/pets/:petId (update)', () => {
    const petId = 'pet-uuid-1';

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp())
        .put(`/api/v1/pets/${petId}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks pets.update permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp())
        .put(`/api/v1/pets/${petId}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/pets/:petId', () => {
    const petId = 'pet-uuid-1';

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).delete(`/api/v1/pets/${petId}`);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks pets.delete permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp()).delete(`/api/v1/pets/${petId}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/pets/featured (public)', () => {
    it('is accessible without authentication', async () => {
      const res = await request(buildApp()).get('/api/v1/pets/featured');
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});
