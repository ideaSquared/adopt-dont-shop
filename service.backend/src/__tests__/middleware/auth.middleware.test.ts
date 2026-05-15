import { vi } from 'vitest';

// Mock jsonwebtoken with error classes
vi.mock('jsonwebtoken', () => {
  class JsonWebTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  }

  class TokenExpiredError extends Error {
    expiredAt: Date;
    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
      this.expiredAt = expiredAt;
    }
  }

  const sign = vi.fn();
  const verify = vi.fn();
  const decode = vi.fn();

  return {
    default: {
      sign,
      verify,
      decode,
      JsonWebTokenError,
      TokenExpiredError,
    },
    sign,
    verify,
    decode,
    JsonWebTokenError,
    TokenExpiredError,
  };
});

// Mock env config before it's imported
vi.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    JWT_SECRET: 'test-jwt-secret-with-minimum-32-chars-required',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-with-minimum-32-chars',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    SESSION_SECRET: 'test-session-secret-32-chars-min',
    CSRF_SECRET: 'test-csrf-secret-with-32-chars',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: 5432,
    POSTGRES_USER: 'test',
    POSTGRES_PASSWORD: 'test',
    POSTGRES_DB: 'test',
  },
  getDatabaseName: () => 'test_db',
}));

// Mock User model before it is imported
vi.mock('../../models/User', () => ({
  __esModule: true,
  UserType: {
    ADOPTER: 'adopter',
    RESCUE_STAFF: 'rescue_staff',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
  },
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    belongsToMany: vi.fn(),
    associate: vi.fn(),
  },
}));

vi.mock('../../models/StaffMember', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn().mockResolvedValue(null),
  },
}));

// Mock RevokedToken model
vi.mock('../../models/RevokedToken', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    create: vi.fn(),
  },
}));

// Mock Role and Permission models before they are imported
vi.mock('../../models/Role', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    belongsToMany: vi.fn(),
    associate: vi.fn(),
  },
}));

vi.mock('../../models/Permission', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    belongsToMany: vi.fn(),
    associate: vi.fn(),
  },
}));

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
// Import error classes from mocked jwt
const { JsonWebTokenError, TokenExpiredError } = jwt;

import {
  authenticateToken,
  optionalAuth,
  requireRole,
  authenticateOptionalToken,
  JWTPayload,
} from '../../middleware/auth';
import { resetAuthCacheForTests } from '../../lib/auth-cache';
import User from '../../models/User';
import RevokedToken from '../../models/RevokedToken';
import { AuthenticatedRequest } from '../../types/auth';
import { logger, loggerHelpers } from '../../utils/logger';
import { env } from '../../config/env';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
      originalUrl: '/api/test',
      // ADS-543: auth-failure logs use req.path (no query string) so secret
      // bearing params (token, signature, code) never reach security logs.
      path: '/api/test',
      get: ((header: string) => {
        if (header === 'User-Agent') {
          return 'test-agent';
        }
        if (header === 'set-cookie') {
          return undefined;
        }
        return undefined;
      }) as AuthenticatedRequest['get'],
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();

    // ADS-253: drop the in-process auth cache so each test sees a fresh
    // User.findByPk mock instead of riding a previous test's cached user.
    resetAuthCacheForTests();

    // Default: token is not revoked
    (RevokedToken.findByPk as vi.Mock).mockResolvedValue(null);
  });

  describe('authenticateToken - Required authentication', () => {
    describe('when no token is provided', () => {
      it('should reject the request and return 401', async () => {
        mockRequest.headers = {};

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access token required',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(loggerHelpers.logSecurity).toHaveBeenCalledWith(
          'Authentication failed - no token provided',
          expect.objectContaining({
            ip: '127.0.0.1',
            userAgent: 'test-agent',
            url: '/api/test',
          }),
          mockRequest
        );
      });

      it('should not include query-string params in the security log (ADS-543)', async () => {
        mockRequest.headers = {};
        mockRequest.originalUrl = '/verify-email?token=xyz-very-secret-123';
        mockRequest.path = '/verify-email';

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        const logCall = (loggerHelpers.logSecurity as vi.Mock).mock.calls[0];
        const logPayload = JSON.stringify(logCall);
        expect(logPayload).not.toContain('token=xyz');
        expect(logPayload).not.toContain('xyz-very-secret-123');
        expect(loggerHelpers.logSecurity).toHaveBeenCalledWith(
          'Authentication failed - no token provided',
          expect.objectContaining({ url: '/verify-email' }),
          mockRequest
        );
      });

      it('should reject when authorization header is present but empty', async () => {
        mockRequest.headers = { authorization: '' };

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access token required',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject when authorization header has no token part', async () => {
        mockRequest.headers = { authorization: 'Bearer' };

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access token required',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when token is invalid', () => {
      it('should reject invalid JWT format and return 401', async () => {
        mockRequest.headers = { authorization: 'Bearer invalid-token' };
        (jwt.verify as vi.Mock).mockImplementation(() => {
          throw new JsonWebTokenError('invalid token');
        });

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid token',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(loggerHelpers.logSecurity).toHaveBeenCalledWith(
          'Authentication failed - token error',
          expect.objectContaining({
            error: 'invalid token',
          }),
          mockRequest
        );
      });

      it('should reject malformed JWT signature', async () => {
        mockRequest.headers = { authorization: 'Bearer malformed.jwt.token' };
        (jwt.verify as vi.Mock).mockImplementation(() => {
          throw new JsonWebTokenError('invalid signature');
        });

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid token',
        });
      });
    });

    describe('when token has been revoked', () => {
      it('should reject a blacklisted access token and return 401', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          jti: 'revoked-jti-abc',
        };

        mockRequest.headers = { authorization: 'Bearer revoked-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (RevokedToken.findByPk as vi.Mock).mockResolvedValue({ jti: 'revoked-jti-abc' });

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token has been revoked' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should allow tokens without jti to bypass revocation check', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          // no jti
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'active',
          emailVerified: true,
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer legacy-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(RevokedToken.findByPk).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when token is expired', () => {
      it('should reject expired tokens and return 401', async () => {
        mockRequest.headers = { authorization: 'Bearer expired-token' };
        (jwt.verify as vi.Mock).mockImplementation(() => {
          throw new TokenExpiredError('jwt expired', new Date());
        });

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Token expired',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(loggerHelpers.logSecurity).toHaveBeenCalledWith(
          'Authentication failed - token error',
          expect.objectContaining({
            error: expect.stringContaining('expired'),
          }),
          mockRequest
        );
      });
    });

    describe('when user does not exist', () => {
      it('should reject tokens for non-existent users', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(null);

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'User not found',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should load user with roles and permissions', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(null);

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(User.findByPk).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            include: expect.arrayContaining([
              expect.objectContaining({
                as: 'Roles',
              }),
            ]),
          })
        );
      });
    });

    describe('when user is inactive', () => {
      it('should reject inactive user accounts', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'inactive',
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Account is not active',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject suspended user accounts', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'suspended',
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Account is not active',
        });
      });
    });

    describe('when authentication succeeds', () => {
      it('should attach active user to request and call next', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'active',
          emailVerified: true,
          Roles: [{ name: 'user' }],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user).toBe(mockUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        // ADS-253: dropped from info-level `loggerHelpers.logAuth` to
        // debug. Failed-auth still logs at info via `logSecurity`.
        expect(logger.debug).toHaveBeenCalledWith(
          'User authenticated',
          expect.objectContaining({
            userId: 'user-123',
            email: 'test@example.com',
          })
        );
      });

      it('should verify token with correct JWT secret', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'active',
          emailVerified: true,
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', env.JWT_SECRET, {
          algorithms: ['HS256'],
        });
      });

      it('should pin JWT algorithm to HS256 for security', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'active',
          emailVerified: true,
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        // Verify algorithms option is passed to prevent algorithm confusion attacks
        expect(jwt.verify).toHaveBeenCalledWith('valid-token', env.JWT_SECRET, {
          algorithms: ['HS256'],
        });
      });

      it('attaches the user with their roles to the request', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'active',
          emailVerified: true,
          Roles: [{ name: 'admin' }, { name: 'moderator' }],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user).toBe(mockUser);
        expect(mockRequest.user?.Roles).toHaveLength(2);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when unexpected errors occur', () => {
      it('should return 500 for unexpected errors', async () => {
        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication error',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should log unexpected errors with security context', async () => {
        mockRequest.headers = { authorization: 'Bearer valid-token' };
        const unexpectedError = new Error('Database connection failed');
        (jwt.verify as vi.Mock).mockImplementation(() => {
          throw unexpectedError;
        });

        await authenticateToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(loggerHelpers.logSecurity).toHaveBeenCalledWith(
          'Authentication failed - token error',
          expect.objectContaining({
            error: 'Database connection failed',
            ip: '127.0.0.1',
            userAgent: 'test-agent',
          }),
          mockRequest
        );
      });
    });
  });

  describe('optionalAuth - Optional authentication', () => {
    describe('when no token is provided', () => {
      it('should continue without authentication', async () => {
        mockRequest.headers = {};

        await optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('when token is invalid', () => {
      it('should continue without authentication on invalid token', async () => {
        mockRequest.headers = { authorization: 'Bearer invalid-token' };
        (jwt.verify as vi.Mock).mockImplementation(() => {
          throw new JsonWebTokenError('invalid token');
        });

        await optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('when token is valid but user not found', () => {
      it('should continue without authentication', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(null);

        await optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('when token is valid and user is inactive', () => {
      it('should continue without authentication for inactive users', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'inactive',
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('when authentication succeeds', () => {
      it('should attach active user to request', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'active',
          emailVerified: true,
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockRequest.user).toBe(mockUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
          'Optional authentication successful',
          expect.objectContaining({
            userId: 'user-123',
          })
        );
      });
    });
  });

  describe('authenticateOptionalToken - Alternative optional authentication', () => {
    describe('when no token is provided', () => {
      it('should continue without authentication', async () => {
        mockRequest.headers = {};

        await authenticateOptionalToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('when token verification fails', () => {
      it('should continue without authentication', async () => {
        mockRequest.headers = { authorization: 'Bearer invalid-token' };
        (jwt.verify as vi.Mock).mockImplementation(() => {
          throw new JsonWebTokenError('invalid token');
        });

        await authenticateOptionalToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('when user not found', () => {
      it('should continue without authentication', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(null);

        await authenticateOptionalToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when user is inactive or suspended', () => {
      it('should treat a suspended user as unauthenticated', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'suspended',
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateOptionalToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should treat an inactive user as unauthenticated', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          status: 'inactive',
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateOptionalToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('when authentication succeeds', () => {
      it('should attach active user to request and call next', async () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
        };
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          userType: 'adopter',
          status: 'active',
          emailVerified: true,
          Roles: [],
        };

        mockRequest.headers = { authorization: 'Bearer valid-token' };
        (jwt.verify as vi.Mock).mockReturnValue(payload);
        (User.findByPk as vi.Mock).mockResolvedValue(mockUser);

        await authenticateOptionalToken(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user).toBe(mockUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireRole - Role-based authorization', () => {
    describe('when user is not authenticated', () => {
      it('should reject request with 401', () => {
        mockRequest.user = undefined;

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication required',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(loggerHelpers.logSecurity).toHaveBeenCalledWith(
          'Role authorization failed - no user',
          expect.objectContaining({
            requiredRoles: ['admin'],
          }),
          mockRequest
        );
      });
    });

    describe('when user lacks required role', () => {
      it('should reject request with 403 for single role', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          Roles: [{ name: 'user' }],
        } as User;

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied. Required roles: admin',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(loggerHelpers.logSecurity).toHaveBeenCalledWith(
          'Role authorization failed - insufficient permissions',
          expect.objectContaining({
            userId: 'user-123',
            userRoles: ['user'],
            requiredRoles: ['admin'],
          }),
          mockRequest
        );
      });

      it('should reject when user has no roles but role is required', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          Roles: undefined,
        } as User;

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied. Required roles: admin',
        });
      });

      it('should reject when user lacks any of multiple required roles', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          Roles: [{ name: 'user' }],
        } as User;

        const middleware = requireRole(['admin', 'moderator']);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied. Required roles: admin, moderator',
        });
      });
    });

    describe('when user has required role', () => {
      it('should allow access for single matching role', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          Roles: [{ name: 'admin' }],
        } as User;

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
          'Role authorization successful',
          expect.objectContaining({
            userId: 'user-123',
            roles: ['admin'],
            requiredRoles: ['admin'],
          })
        );
      });

      it('should allow access when user has one of multiple required roles', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          Roles: [{ name: 'moderator' }, { name: 'user' }],
        } as User;

        const middleware = requireRole(['admin', 'moderator']);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should allow access when user has multiple roles including required', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          Roles: [{ name: 'admin' }, { name: 'moderator' }, { name: 'user' }],
        } as User;

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when role check is given as string or array', () => {
      it('should handle single role as string', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          Roles: [{ name: 'admin' }],
        } as User;

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle multiple roles as array', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          Roles: [{ name: 'moderator' }],
        } as User;

        const middleware = requireRole(['admin', 'moderator', 'support']);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when unexpected errors occur', () => {
      it('should return 500 for unexpected errors', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          // Simulate error by making Roles throw when accessed
          get Roles(): unknown {
            throw new Error('Database error');
          },
        } as User;

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authorization error',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          'Role authorization error:',
          expect.objectContaining({
            error: 'Database error',
            userId: 'user-123',
          })
        );
      });
    });
  });
});
