// src/middlewares/errorHandler.ts
import { NextFunction, Request, Response } from 'express'

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

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  })
}

export default errorHandler
