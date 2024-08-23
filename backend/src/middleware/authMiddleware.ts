import { NextFunction, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AuditLogger } from '../services/auditLogService'
import { AuthenticatedRequest } from '../types/AuthenticatedRequest'

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    AuditLogger.logAction(
      'AuthService',
      'Authentication failed due to missing or invalid token',
      'WARNING',
    )
    return res
      .status(401)
      .json({ message: 'Authentication token missing or invalid' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const secretKey = process.env.SECRET_KEY as string
    const decoded = jwt.verify(token, secretKey) as { userId: string }

    if (!decoded || !decoded.userId) {
      AuditLogger.logAction(
        'AuthService',
        'Authentication failed due to missing user ID in token',
        'WARNING',
      )
      return res.status(401).json({ message: 'Invalid token' })
    }

    // Attach the user ID from the token to the request object
    req.user = decoded.userId

    AuditLogger.logAction(
      'AuthService',
      `User authenticated successfully with ID: ${req.user}`,
      'INFO',
      req.user,
    )

    next()
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('jwt')) {
        AuditLogger.logAction(
          'AuthService',
          `Jwt authentication failed with error: ${error.message}`,
          'ERROR',
        )
        res.status(401).json({ message: 'JWT token expired' })
      }

      AuditLogger.logAction(
        'AuthService',
        `Authentication failed with error: ${error.message}`,
        'ERROR',
      )
    } else {
      AuditLogger.logAction(
        'AuthService',
        'Authentication failed due to an unknown error',
        'ERROR',
      )
    }
    res.status(403).json({ message: 'Forbidden' })
  }
}
