import { Request, Response, NextFunction } from 'express';
import { BaseError as SequelizeBaseError } from 'sequelize';
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

  // Handle body-parser JSON parse failures. Express 5 propagates the
  // body-parser SyntaxError through the standard async-catch path
  // (Express 4 collapsed it inside the parser). Without an explicit
  // branch the error falls through to the generic 500, but the user
  // contract is "malformed JSON → 400" per ADS-531 §3.2.
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as SyntaxError & { status: number }).status === 400 &&
    'body' in err
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Malformed JSON in request body',
      code: 400,
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

  // ADS-413: catch all other Sequelize errors (DatabaseError,
  // ForeignKeyConstraintError, ConnectionError, etc.) so they don't
  // fall through to the generic 500 path that echoes `err.message` —
  // raw DB error text leaks table/column names and SQL fragments.
  if (err instanceof SequelizeBaseError) {
    return res.status(500).json({
      status: 'error',
      message: 'A database error occurred',
      code: 500,
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
