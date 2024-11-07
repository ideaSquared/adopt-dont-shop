import { NextFunction, Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import { verifyUserHasRole } from '../services/permissionService'
import { AuthenticatedRequest } from '../types/AuthenticatedRequest'

export const checkUserRole = (requiredRole: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) return
    const userId = req.user.user_id

    try {
      const hasRole = await verifyUserHasRole(userId, requiredRole)

      if (!hasRole) {
        await AuditLogger.logAction(
          'RoleCheckMiddleware',
          `User with ID: ${userId} attempted to access a resource requiring role: ${requiredRole} but does not have this role`,
          'WARNING',
          userId,
        )
        return res
          .status(403)
          .json({ message: 'Forbidden: insufficient permissions' })
      }

      await AuditLogger.logAction(
        'RoleCheckMiddleware',
        `User with ID: ${userId} accessed a resource requiring role: ${requiredRole}`,
        'INFO',
        userId,
      )
      next()
    } catch (error) {
      // Narrow down the error type to handle it appropriately
      if (error instanceof Error) {
        console.error(error.message)
        await AuditLogger.logAction(
          'RoleCheckMiddleware',
          `Error during role check for user with ID: ${userId}. Error: ${error.message}`,
          'ERROR',
          userId,
        )
        return res.status(500).json({ message: 'Internal server error' })
      } else {
        // Handle cases where the error might not be an instance of Error
        console.error('Unknown error occurred during role check')
        await AuditLogger.logAction(
          'RoleCheckMiddleware',
          `Unknown error during role check for user with ID: ${userId}`,
          'ERROR',
          userId,
        )
        return res.status(500).json({ message: 'Internal server error' })
      }
    }
  }
}
