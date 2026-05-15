import { vi } from 'vitest';

// Mock csrf-csrf library
vi.mock('csrf-csrf', () => {
  const mockGenerateToken = vi.fn();
  const mockDoubleCsrfProtection = vi.fn();

  return {
    doubleCsrf: vi.fn(() => ({
      generateCsrfToken: mockGenerateToken,
      doubleCsrfProtection: mockDoubleCsrfProtection,
    })),
  };
});

// Mock config
vi.mock('../../config', () => ({
  config: {
    security: {
      csrfSecret: 'test-csrf-secret-with-32-characters-minimum',
    },
  },
}));

import { Request, Response, NextFunction } from 'express';
import {
  csrfTokenGenerator,
  csrfProtection,
  getCsrfToken,
  csrfErrorHandler,
  resolveCsrfSessionIdentifier,
} from '../../middleware/csrf';
import { logger } from '../../utils/logger';
import { doubleCsrf } from 'csrf-csrf';

// Get references to the mocked functions
const { generateCsrfToken: mockGenerateToken, doubleCsrfProtection: mockDoubleCsrfProtection } = (
  doubleCsrf as ReturnType<typeof vi.fn>
)();

describe('CSRF Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      path: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    };
    mockResponse = {
      locals: {},
      setHeader: vi.fn(),
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('csrfTokenGenerator - Token generation middleware', () => {
    describe('when token generation succeeds', () => {
      it('should generate CSRF token and attach to response locals', () => {
        const generatedToken = 'test-csrf-token-123';
        mockGenerateToken.mockReturnValue(generatedToken);

        csrfTokenGenerator(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockGenerateToken).toHaveBeenCalledWith(mockRequest, mockResponse);
        expect(mockResponse.locals).toEqual({
          csrfToken: generatedToken,
        });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should set X-CSRF-Token header for API consumers', () => {
        const generatedToken = 'test-csrf-token-456';
        mockGenerateToken.mockReturnValue(generatedToken);

        csrfTokenGenerator(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-CSRF-Token', generatedToken);
      });

      it('should call next without error', () => {
        mockGenerateToken.mockReturnValue('test-token');

        csrfTokenGenerator(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });
    });

    describe('when token generation fails', () => {
      it('should log error and pass to next middleware', () => {
        const error = new Error('Token generation failed');
        mockGenerateToken.mockImplementation(() => {
          throw error;
        });

        csrfTokenGenerator(mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.error).toHaveBeenCalledWith('Failed to generate CSRF token', { error });
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should not set response locals on error', () => {
        mockGenerateToken.mockImplementation(() => {
          throw new Error('Generation error');
        });

        csrfTokenGenerator(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.locals?.csrfToken).toBeUndefined();
      });

      it('should not set header on error', () => {
        mockGenerateToken.mockImplementation(() => {
          throw new Error('Generation error');
        });

        csrfTokenGenerator(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.setHeader).not.toHaveBeenCalled();
      });
    });
  });

  describe('getCsrfToken - Route handler for token endpoint', () => {
    describe('when token generation succeeds', () => {
      it('should generate token and return in JSON response', () => {
        const generatedToken = 'csrf-token-789';
        mockGenerateToken.mockReturnValue(generatedToken);

        getCsrfToken(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockGenerateToken).toHaveBeenCalledWith(mockRequest, mockResponse, {
          overwrite: true,
        });
        expect(mockResponse.json).toHaveBeenCalledWith({
          csrfToken: generatedToken,
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return fresh token on each call', () => {
        const firstToken = 'token-1';
        const secondToken = 'token-2';

        mockGenerateToken.mockReturnValueOnce(firstToken);
        getCsrfToken(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith({
          csrfToken: firstToken,
        });

        vi.clearAllMocks();

        mockGenerateToken.mockReturnValueOnce(secondToken);
        getCsrfToken(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith({
          csrfToken: secondToken,
        });
      });
    });

    describe('when token generation fails', () => {
      it('should log error and pass to error handler', () => {
        const error = new Error('Token endpoint error');
        mockGenerateToken.mockImplementation(() => {
          throw error;
        });

        getCsrfToken(mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.error).toHaveBeenCalledWith('Failed to generate CSRF token', { error });
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should not send JSON response on error', () => {
        mockGenerateToken.mockImplementation(() => {
          throw new Error('Generation failed');
        });

        getCsrfToken(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).not.toHaveBeenCalled();
      });
    });
  });

  describe('csrfProtection - Validation middleware', () => {
    it('should export the double CSRF protection middleware', () => {
      expect(csrfProtection).toBeDefined();
      expect(csrfProtection).toBe(mockDoubleCsrfProtection);
    });
  });

  // ADS-546: stable per-browser identifier with no 'anonymous' fallback.
  describe('resolveCsrfSessionIdentifier - session identifier resolution', () => {
    type FakeRequest = Request & {
      cookies?: Record<string, string>;
      user?: { userId?: string };
      res?: Partial<Response>;
    };

    const makeReq = (overrides: Partial<FakeRequest> = {}): FakeRequest => {
      const cookieFn = vi.fn();
      const res: Partial<Response> = { cookie: cookieFn };
      return {
        cookies: undefined,
        user: undefined,
        res,
        ...overrides,
      } as FakeRequest;
    };

    it('returns the authenticated user identifier when req.user.userId is set', () => {
      const req = makeReq({ user: { userId: 'user-abc' } });
      expect(resolveCsrfSessionIdentifier(req)).toBe('user:user-abc');
    });

    it('returns the existing session cookie value when present', () => {
      const req = makeReq({ cookies: { 'csrf-session': 'fixed-uuid-123' } });
      // The cookie name depends on NODE_ENV — both keys are tried in source,
      // so we set the dev-name one (NODE_ENV=test).
      expect(resolveCsrfSessionIdentifier(req)).toBe('anon:fixed-uuid-123');
      expect((req.res as { cookie: ReturnType<typeof vi.fn> }).cookie).not.toHaveBeenCalled();
    });

    it('mints and sets a new UUID cookie when neither userId nor cookie is present', () => {
      const req = makeReq();
      const identifier = resolveCsrfSessionIdentifier(req);
      expect(identifier).toMatch(/^anon:[0-9a-f-]{36}$/);
      const cookieFn = (req.res as { cookie: ReturnType<typeof vi.fn> }).cookie;
      expect(cookieFn).toHaveBeenCalledTimes(1);
      const [name, value, options] = cookieFn.mock.calls[0];
      expect(name).toBe('csrf-session');
      expect(value).toMatch(/^[0-9a-f-]{36}$/);
      expect(options).toMatchObject({ httpOnly: true, sameSite: 'strict' });
    });

    it('throws when no userId, no cookie, and no Response are available (fail closed)', () => {
      const req = { cookies: undefined, user: undefined } as FakeRequest;
      expect(() => resolveCsrfSessionIdentifier(req)).toThrow(/unable to resolve a session/);
    });

    it('does not fall back to a constant anonymous value', () => {
      const reqA = makeReq();
      const reqB = makeReq();
      const idA = resolveCsrfSessionIdentifier(reqA);
      const idB = resolveCsrfSessionIdentifier(reqB);
      expect(idA).not.toBe(idB);
      expect(idA).not.toBe('anonymous');
      expect(idB).not.toBe('anonymous');
    });
  });

  describe('csrfErrorHandler - Error handling middleware', () => {
    describe('when CSRF validation error occurs', () => {
      it('should handle EBADCSRFTOKEN error code', () => {
        const error = Object.assign(new Error('CSRF validation failed'), {
          code: 'EBADCSRFTOKEN',
        });

        csrfErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid CSRF token',
          message: 'CSRF token validation failed. Please refresh and try again.',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle error with CSRF in message', () => {
        const error = Object.assign(new Error('CSRF token mismatch'), {});

        csrfErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid CSRF token',
          message: 'CSRF token validation failed. Please refresh and try again.',
        });
      });

      it('should log CSRF validation failure with request details', () => {
        const error = Object.assign(new Error('CSRF error'), {
          code: 'EBADCSRFTOKEN',
        });

        csrfErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith('CSRF token validation failed', {
          method: 'POST',
          path: '/api/test',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        });
      });

      it('should handle CSRF keyword in error message', () => {
        const error = Object.assign(new Error('CSRF token invalid'), {});

        csrfErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid CSRF token',
          message: 'CSRF token validation failed. Please refresh and try again.',
        });
      });
    });

    describe('when non-CSRF error occurs', () => {
      it('should pass error to next middleware', () => {
        const error = new Error('Database connection error');

        csrfErrorHandler(
          error as Error & { code?: string },
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(error);
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
      });

      it('should not log non-CSRF errors', () => {
        const error = new Error('Some other error');

        csrfErrorHandler(
          error as Error & { code?: string },
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(logger.warn).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(error);
      });

      it('should handle error without code or message', () => {
        const error = Object.assign(new Error(), {});

        csrfErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error);
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('when handling different request methods', () => {
      it('should log GET request CSRF failures', () => {
        mockRequest.method = 'GET';
        const error = Object.assign(new Error('CSRF error'), {
          code: 'EBADCSRFTOKEN',
        });

        csrfErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'CSRF token validation failed',
          expect.objectContaining({
            method: 'GET',
          })
        );
      });

      it('should log DELETE request CSRF failures', () => {
        mockRequest.method = 'DELETE';
        const error = Object.assign(new Error('CSRF error'), {
          code: 'EBADCSRFTOKEN',
        });

        csrfErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'CSRF token validation failed',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    describe('when request has missing headers', () => {
      it('should handle missing user-agent gracefully', () => {
        mockRequest.headers = {};
        const error = Object.assign(new Error('CSRF error'), {
          code: 'EBADCSRFTOKEN',
        });

        csrfErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'CSRF token validation failed',
          expect.objectContaining({
            userAgent: undefined,
          })
        );
        expect(mockResponse.status).toHaveBeenCalledWith(403);
      });

      it('should handle missing ip gracefully', () => {
        const requestWithoutIp = {
          ...mockRequest,
          ip: undefined,
        };
        const error = Object.assign(new Error('CSRF error'), {
          code: 'EBADCSRFTOKEN',
        });

        csrfErrorHandler(error, requestWithoutIp as Request, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'CSRF token validation failed',
          expect.objectContaining({
            ip: undefined,
          })
        );
      });
    });
  });
});
