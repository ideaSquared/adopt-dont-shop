// Mock logger before importing error handler
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { Request, Response, NextFunction } from 'express';
import { errorHandler, ApiError } from '../../middleware/error-handler';
import { logger } from '../../utils/logger';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      originalUrl: '/api/test',
      path: '/api/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('ApiError class', () => {
    it('should create error with correct properties', () => {
      const error = new ApiError(400, 'Bad request');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.isOperational).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should allow setting isOperational flag', () => {
      const error = new ApiError(500, 'Internal error', false);

      expect(error.isOperational).toBe(false);
    });

    it('should capture stack trace', () => {
      const error = new ApiError(404, 'Not found');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should default isOperational to true', () => {
      const error = new ApiError(400, 'Bad request');

      expect(error.isOperational).toBe(true);
    });
  });

  describe('errorHandler - ApiError handling', () => {
    it('should handle ApiError with correct status code', () => {
      const error = new ApiError(404, 'Resource not found');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return proper ApiError response format', () => {
      const error = new ApiError(403, 'Access denied');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Access denied',
          code: 403,
        })
      );
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new ApiError(400, 'Bad request');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );
    });

    it('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new ApiError(400, 'Bad request');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });

    it('should log ApiError details', () => {
      const error = new ApiError(500, 'Server error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Server error - /api/test - POST');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error: Server error'));
    });
  });

  describe('errorHandler - Sequelize validation errors', () => {
    it('should handle SequelizeValidationError with 400 status', () => {
      const error = Object.assign(new Error('Validation failed'), {
        name: 'SequelizeValidationError',
        errors: [
          { path: 'email', message: 'Email is required' },
          { path: 'password', message: 'Password must be at least 8 characters' },
        ],
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should format validation errors correctly', () => {
      const error = Object.assign(new Error('Validation failed'), {
        name: 'SequelizeValidationError',
        errors: [
          { path: 'email', message: 'Email is invalid' },
          { path: 'firstName', message: 'First name is required' },
        ],
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation error',
        errors: [
          { field: 'email', message: 'Email is invalid' },
          { field: 'firstName', message: 'First name is required' },
        ],
        code: 400,
      });
    });

    it('should handle SequelizeUniqueConstraintError', () => {
      const error = Object.assign(new Error('Unique constraint violated'), {
        name: 'SequelizeUniqueConstraintError',
        errors: [{ path: 'email', message: 'Email must be unique' }],
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Validation error',
          code: 400,
        })
      );
    });

    it('should handle validation errors with no errors array', () => {
      const error = Object.assign(new Error('Validation failed'), {
        name: 'SequelizeValidationError',
        errors: undefined,
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('errorHandler - JWT errors', () => {
    it('should handle JsonWebTokenError with 401 status', () => {
      const error = Object.assign(new Error('Invalid token'), {
        name: 'JsonWebTokenError',
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token. Please log in again',
        code: 401,
      });
    });

    it('should handle TokenExpiredError with 401 status', () => {
      const error = Object.assign(new Error('Token expired'), {
        name: 'TokenExpiredError',
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token expired. Please log in again',
        code: 401,
      });
    });

    it('should log JWT errors', () => {
      const error = Object.assign(new Error('Invalid token'), {
        name: 'JsonWebTokenError',
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Invalid token - /api/test - POST');
    });
  });

  describe('errorHandler - Generic errors', () => {
    it('should handle generic errors with 500 status', () => {
      const error = new Error('Unexpected error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should return detailed message in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Database connection failed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Database connection failed',
          code: 500,
        })
      );
    });

    it('should return generic message in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal database error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Something went wrong',
          code: 500,
        })
      );
    });

    it('should include stack trace in development mode for generic errors', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );
    });

    it('should not include stack trace in production mode for generic errors', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });

    it('should log generic errors with request details', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Something went wrong - /api/test - POST');
    });

    it('should handle errors without stack trace', () => {
      const error = new Error('No stack');
      error.stack = undefined;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('No stack trace available');
    });
  });

  describe('errorHandler - Logging behavior', () => {
    it('should log error message with request context', () => {
      mockRequest.method = 'GET';
      mockRequest.originalUrl = '/api/users/123';
      const error = new Error('User not found');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('User not found - /api/users/123 - GET');
    });

    it('should log stack trace when available', () => {
      const error = new Error('Test error');
      const stackTrace = error.stack;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(stackTrace);
    });

    it('should log for different HTTP methods', () => {
      mockRequest.method = 'DELETE';
      mockRequest.originalUrl = '/api/pets/456';
      const error = new Error('Delete failed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Delete failed - /api/pets/456 - DELETE');
    });
  });

  describe('errorHandler - Response format consistency', () => {
    it('should always include status field', () => {
      const error = new Error('Test');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.status).toBe('error');
    });

    it('should always include code field', () => {
      const error = new ApiError(404, 'Not found');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.code).toBe(404);
    });

    it('should always include message field', () => {
      const error = new Error('Something failed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.message).toBeDefined();
    });
  });

  describe('errorHandler - Different error status codes', () => {
    it('should handle 400 Bad Request', () => {
      const error = new ApiError(400, 'Invalid input');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle 401 Unauthorized', () => {
      const error = new ApiError(401, 'Not authenticated');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle 403 Forbidden', () => {
      const error = new ApiError(403, 'Access denied');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should handle 404 Not Found', () => {
      const error = new ApiError(404, 'Resource not found');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle 409 Conflict', () => {
      const error = new ApiError(409, 'Resource already exists');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
    });

    it('should handle 500 Internal Server Error', () => {
      const error = new ApiError(500, 'Server error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
