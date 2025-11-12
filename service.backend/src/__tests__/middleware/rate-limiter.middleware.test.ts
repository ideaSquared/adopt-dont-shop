// Store rate limit configurations for inspection
const rateLimitConfigs: Array<Record<string, unknown>> = [];

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn(options => {
    rateLimitConfigs.push(options as Record<string, unknown>);
    // Return a mock middleware function
    return jest.fn((req, res, next) => next());
  });
});

// Mock config
jest.mock('../../config', () => ({
  config: {
    nodeEnv: 'test',
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },
  },
}));

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../../utils/logger';
import {
  apiLimiter,
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
} from '../../middleware/rate-limiter';

describe('Rate Limiter Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      path: '/api/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Rate limiter initialization', () => {
    it('should create multiple rate limiters', () => {
      expect(rateLimitConfigs.length).toBe(4); // API, Auth, Password Reset, Upload
    });

    it('should configure all limiters with standard headers', () => {
      rateLimitConfigs.forEach(config => {
        expect(config.standardHeaders).toBe(true);
      });
    });

    it('should disable legacy headers for all limiters', () => {
      rateLimitConfigs.forEach(config => {
        expect(config.legacyHeaders).toBe(false);
      });
    });
  });

  describe('API limiter (apiLimiter)', () => {
    it('should be defined and exported', () => {
      expect(apiLimiter).toBeDefined();
    });

    it('should configure with correct window and max requests', () => {
      const apiConfig = rateLimitConfigs[0];
      expect(apiConfig.windowMs).toBe(60000);
      expect(apiConfig.max).toBe(100);
    });

    it('should have a handler function', () => {
      const apiConfig = rateLimitConfigs[0];
      expect(typeof apiConfig.handler).toBe('function');
    });

    it('should log rate limit violations', () => {
      const apiConfig = rateLimitConfigs[0];
      const handler = apiConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return 429 status on rate limit', () => {
      const apiConfig = rateLimitConfigs[0];
      const handler = apiConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should include error message and retry after', () => {
      const apiConfig = rateLimitConfigs[0];
      const handler = apiConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          retryAfter: expect.any(Number),
        })
      );
    });
  });

  describe('General limiter alias', () => {
    it('should be an alias for apiLimiter', () => {
      expect(generalLimiter).toBe(apiLimiter);
    });
  });

  describe('Authentication limiter (authLimiter)', () => {
    it('should be defined and exported', () => {
      expect(authLimiter).toBeDefined();
    });

    it('should configure with strict limits (5 per 15 minutes)', () => {
      const authConfig = rateLimitConfigs[1];
      expect(authConfig.windowMs).toBe(15 * 60 * 1000);
      expect(authConfig.max).toBe(5);
    });

    it('should skip successful requests', () => {
      const authConfig = rateLimitConfigs[1];
      expect(authConfig.skipSuccessfulRequests).toBe(true);
    });

    it('should have auth-specific error handler', () => {
      const authConfig = rateLimitConfigs[1];
      const handler = authConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Auth rate limit exceeded'));
    });

    it('should return 429 with auth-specific message', () => {
      const authConfig = rateLimitConfigs[1];
      const handler = authConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 900,
      });
    });

    it('should configure message with 15 minute retry', () => {
      const authConfig = rateLimitConfigs[1];
      expect(authConfig.message).toEqual({
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 900,
      });
    });
  });

  describe('Password reset limiter (passwordResetLimiter)', () => {
    it('should be defined and exported', () => {
      expect(passwordResetLimiter).toBeDefined();
    });

    it('should configure with moderate limits (3 per hour)', () => {
      const resetConfig = rateLimitConfigs[2];
      expect(resetConfig.windowMs).toBe(60 * 60 * 1000);
      expect(resetConfig.max).toBe(3);
    });

    it('should have password reset specific error handler', () => {
      const resetConfig = rateLimitConfigs[2];
      const handler = resetConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Password reset rate limit exceeded')
      );
    });

    it('should return 429 with password reset message', () => {
      const resetConfig = rateLimitConfigs[2];
      const handler = resetConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many password reset attempts, please try again later.',
        retryAfter: 3600,
      });
    });

    it('should configure message with 1 hour retry', () => {
      const resetConfig = rateLimitConfigs[2];
      expect(resetConfig.message).toEqual({
        error: 'Too many password reset attempts, please try again later.',
        retryAfter: 3600,
      });
    });
  });

  describe('Upload limiter (uploadLimiter)', () => {
    it('should be defined and exported', () => {
      expect(uploadLimiter).toBeDefined();
    });

    it('should configure with moderate limits (20 per 15 minutes)', () => {
      const uploadConfig = rateLimitConfigs[3];
      expect(uploadConfig.windowMs).toBe(15 * 60 * 1000);
      expect(uploadConfig.max).toBe(20);
    });

    it('should have upload-specific error handler', () => {
      const uploadConfig = rateLimitConfigs[3];
      const handler = uploadConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Upload rate limit exceeded')
      );
    });

    it('should return 429 with upload-specific message', () => {
      const uploadConfig = rateLimitConfigs[3];
      const handler = uploadConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many file uploads, please try again later.',
        retryAfter: 900,
      });
    });

    it('should configure message with 15 minute retry', () => {
      const uploadConfig = rateLimitConfigs[3];
      expect(uploadConfig.message).toEqual({
        error: 'Too many file uploads, please try again later.',
        retryAfter: 900,
      });
    });
  });

  describe('Handler behavior with request details', () => {
    it('should log IP address in rate limit violations', () => {
      const apiConfig = rateLimitConfigs[0];
      const handler = apiConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('127.0.0.1'));
    });

    it('should log path in rate limit violations', () => {
      const apiConfig = rateLimitConfigs[0];
      const handler = apiConfig.handler as (req: Request, res: Response) => void;

      handler(mockRequest as Request, mockResponse as Response);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('/api/test'));
    });
  });

  describe('Rate limiter configuration values', () => {
    it('should use consistent standardHeaders setting across all limiters', () => {
      const standardHeadersValues = rateLimitConfigs.map(config => config.standardHeaders);
      const allTrue = standardHeadersValues.every(val => val === true);
      expect(allTrue).toBe(true);
    });

    it('should use consistent legacyHeaders setting across all limiters', () => {
      const legacyHeadersValues = rateLimitConfigs.map(config => config.legacyHeaders);
      const allFalse = legacyHeadersValues.every(val => val === false);
      expect(allFalse).toBe(true);
    });

    it('should have appropriate window times for security endpoints', () => {
      const authWindow = rateLimitConfigs[1].windowMs;
      const resetWindow = rateLimitConfigs[2].windowMs;

      // Auth and password reset should have longer windows
      expect(authWindow).toBeGreaterThan(5 * 60 * 1000); // > 5 minutes
      expect(resetWindow).toBeGreaterThan(30 * 60 * 1000); // > 30 minutes
    });

    it('should have stricter limits for security endpoints', () => {
      const apiMax = rateLimitConfigs[0].max;
      const authMax = rateLimitConfigs[1].max;
      const resetMax = rateLimitConfigs[2].max;

      // Security endpoints should have much stricter limits
      expect(authMax).toBeLessThan(apiMax as number);
      expect(resetMax).toBeLessThan(apiMax as number);
    });
  });
});
