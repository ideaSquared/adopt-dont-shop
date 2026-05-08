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

vi.mock('../../services/messageSearch.service', () => ({
  MessageSearchService: {
    searchMessages: vi.fn(),
    getSearchSuggestions: vi.fn(),
  },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  apiLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  // ADS-517 added a dedicated searchLimiter for /search routes; test mock
  // exposes a no-op so the route file can import it.
  searchLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  reportLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  sensitiveWriteLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  accountDeletionLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
  invitationSendLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();
vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import { MessageSearchService } from '../../services/messageSearch.service';
import searchRouter from '../../routes/search.routes';

const mockSearchMessages = vi.mocked(MessageSearchService.searchMessages);
const mockGetSuggestions = vi.mocked(MessageSearchService.getSearchSuggestions);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/search', searchRouter);
  return app;
};

const mockUser = {
  userId: 'user-1',
  email: 'user@example.com',
  userType: 'adopter',
};

describe('Search routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );
    app = buildApp();
  });

  describe('GET /api/v1/search/messages', () => {
    it('returns 400 when q query parameter is missing', async () => {
      // Controller hand-rolls validation and returns 400 directly, so the
      // ADS-455/469 422-for-schema convention (which targets the Zod /
      // express-validator middleware paths) doesn't apply here.
      const res = await request(app).get('/api/v1/search/messages');
      expect(res.status).toBe(400);
      expect(mockSearchMessages).not.toHaveBeenCalled();
    });

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });
      const res = await request(app).get('/api/v1/search/messages').query({ q: 'hello' });
      expect(res.status).toBe(401);
    });

    it('returns 200 with results when query is provided', async () => {
      mockSearchMessages.mockResolvedValue({
        results: [{ messageId: 'm1', content: 'hello world' }],
        total: 1,
        page: 1,
        limit: 50,
      });

      const res = await request(app).get('/api/v1/search/messages').query({ q: 'hello' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveLength(1);
    });

    it('caps the limit at 100 even when client requests more', async () => {
      mockSearchMessages.mockResolvedValue({ results: [], total: 0, page: 1, limit: 100 });

      await request(app).get('/api/v1/search/messages').query({ q: 'hello', limit: '500' });

      expect(mockSearchMessages).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
    });

    it('returns 500 when service throws', async () => {
      mockSearchMessages.mockRejectedValue(new Error('search index down'));
      const res = await request(app).get('/api/v1/search/messages').query({ q: 'x' });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/v1/search/suggestions', () => {
    it('returns 400 when q query parameter is missing', async () => {
      // Controller hand-rolls validation and returns 400 directly.
      const res = await request(app).get('/api/v1/search/suggestions');
      expect(res.status).toBe(400);
      expect(mockGetSuggestions).not.toHaveBeenCalled();
    });

    it('returns 200 with suggestions for the authenticated user', async () => {
      mockGetSuggestions.mockResolvedValue(['hello', 'help']);
      const res = await request(app).get('/api/v1/search/suggestions').query({ q: 'he' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.suggestions).toEqual(['hello', 'help']);
      expect(mockGetSuggestions).toHaveBeenCalledWith('he', mockUser.userId);
    });

    it('returns 500 when service throws', async () => {
      mockGetSuggestions.mockRejectedValue(new Error('boom'));
      const res = await request(app).get('/api/v1/search/suggestions').query({ q: 'he' });
      expect(res.status).toBe(500);
    });
  });
});
