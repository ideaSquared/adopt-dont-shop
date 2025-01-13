// src/middlewares/errorHandler.ts
import { NextFunction, Request, Response } from 'express'
import { AuditLogger } from '../services/auditLogService'

interface ErrorWithStatusCode extends Error {
  statusCode?: number
}

const errorHandler = (
  err: ErrorWithStatusCode,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err.stack)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  // Audit log the error
  AuditLogger.logAction(
    'ErrorHandler',
    `Error occurred: ${message} - Status code: ${statusCode} - Path: ${req.path}`,
    'ERROR',
    (req as any).user || null,
  )

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  })
}

export default errorHandler
