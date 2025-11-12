import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // Log the error
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method}`);
  logger.error(err.stack || 'No stack trace available');

  // Handle ApiError type
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      code: err.statusCode,
      // Include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    type SequelizeError = { path?: string; message: string };
    const sequelizeErr = err as { errors?: SequelizeError[] };

    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: sequelizeErr.errors?.map(e => ({
        field: e.path,
        message: e.message,
      })),
      code: 400,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again',
      code: 401,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired. Please log in again',
      code: 401,
    });
  }

  // Default server error
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    code: 500,
    // Include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
