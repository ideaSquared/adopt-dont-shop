import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

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

vi.mock('../../services/cms.service', () => ({
  default: {
    listContent: vi.fn(),
    getContentBySlug: vi.fn(),
    generateSlug: vi.fn(),
  },
}));

const authenticateTokenMock = vi.fn();
const requireRoleMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
  requireRole:
    (roles: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requireRoleMock(roles, req, res, next),
}));

import CmsService from '../../services/cms.service';
import cmsRouter from '../../routes/cms.routes';

const mockList = vi.mocked(CmsService.listContent);
const mockGetBySlug = vi.mocked(CmsService.getContentBySlug);
const mockGenerateSlug = vi.mocked(CmsService.generateSlug);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/cms', cmsRouter);
  // Centralised error handler so unhandled service rejections become 500.
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ success: false, error: err.message });
    }
  );
  return app;
};

const adminUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  Roles: [{ roleName: 'admin' }],
};

describe('CMS routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = adminUser as AuthenticatedRequest['user'];
        next();
      }
    );
    requireRoleMock.mockImplementation((_roles, _req, _res, next) => next());
  });

  describe('GET /api/v1/cms/public/content (no auth required)', () => {
    it('returns published content without invoking auth middleware', async () => {
      mockList.mockResolvedValue({ items: [{ slug: 'about' }], total: 1 });
      const res = await request(buildApp()).get('/api/v1/cms/public/content');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(authenticateTokenMock).not.toHaveBeenCalled();
      expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
    });

    it('forwards search and pagination query params', async () => {
      mockList.mockResolvedValue({ items: [], total: 0 });
      await request(buildApp())
        .get('/api/v1/cms/public/content')
        .query({ search: 'cats', page: '2', limit: '20' });

      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'cats', page: 2, limit: 20, status: 'published' })
      );
    });
  });

  describe('GET /api/v1/cms/public/content/:slug', () => {
    it('returns 200 when the slug resolves to a published page', async () => {
      mockGetBySlug.mockResolvedValue({ slug: 'about', status: 'published' });
      const res = await request(buildApp()).get('/api/v1/cms/public/content/about');
      expect(res.status).toBe(200);
      expect(res.body.content.slug).toBe('about');
    });

    it('returns 404 when the resolved page is not published', async () => {
      mockGetBySlug.mockResolvedValue({ slug: 'about', status: 'draft' });
      const res = await request(buildApp()).get('/api/v1/cms/public/content/about');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/cms/slug (admin-only)', () => {
    it('returns 401 when the user is unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req, res: Response) => {
        res.status(401).json({ error: 'unauthenticated' });
      });
      const res = await request(buildApp()).get('/api/v1/cms/slug').query({ title: 'Hi' });
      expect(res.status).toBe(401);
    });

    it('returns 403 when the user lacks the admin role', async () => {
      requireRoleMock.mockImplementation((_roles, _req, res: Response) => {
        res.status(403).json({ error: 'forbidden' });
      });
      const res = await request(buildApp()).get('/api/v1/cms/slug').query({ title: 'Hi' });
      expect(res.status).toBe(403);
    });

    it('returns 400 when the title query param is missing', async () => {
      const res = await request(buildApp()).get('/api/v1/cms/slug');
      expect(res.status).toBe(400);
    });

    it('returns the generated slug when admin provides a title', async () => {
      mockGenerateSlug.mockReturnValue('hello-world');
      const res = await request(buildApp()).get('/api/v1/cms/slug').query({ title: 'Hello World' });
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('hello-world');
    });
  });
});
