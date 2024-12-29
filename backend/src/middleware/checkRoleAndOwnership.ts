import { NextFunction, Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import {
  getRolesForUser,
  verifyUserHasRole,
} from '../services/permissionService'
import { verifyPetOwnership } from '../services/petService'
import { AuthenticatedRequest } from '../types/AuthenticatedRequest'

export const checkRoleAndOwnership = (requiredRole: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const { user } = req
    const { id: petId } = req.params

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const userId = user.user_id
    const userRescueId = user.rescue_id || null

    try {
      // Use service to check if the user has the required role
      const hasRole = await verifyUserHasRole(userId, requiredRole)
      if (!hasRole) {
        await AuditLogger.logAction(
          'RoleCheckMiddleware',
          `User with ID: ${userId} attempted to access a resource requiring role: ${requiredRole} but does not have this role`,
          'WARNING',
          userId,
        )
        return res.status(403).json({ message: 'Forbidden: Insufficient role' })
      }

      const roles = await getRolesForUser(userId)

      // Admin role bypasses ownership validation
      if (roles.includes('admin')) {
        await AuditLogger.logAction(
          'OwnershipMiddleware',
          `User with ID: ${userId} has the admin role, bypassing ownership check`,
          'INFO',
          userId,
        )
        return next()
      }

      // Check ownership for non-admin roles
      const ownsPet = await verifyPetOwnership(userRescueId, petId)
      if (!ownsPet) {
        await AuditLogger.logAction(
          'OwnershipMiddleware',
          `User with ID: ${userId} attempted to access a resource they do not own (Pet ID: ${petId})`,
          'WARNING',
          userId,
        )
        return res
          .status(403)
          .json({ message: 'Forbidden: You do not own this pet' })
      }

      // User has the required role and ownership
      await AuditLogger.logAction(
        'RoleOwnershipMiddleware',
        `User with ID: ${userId} has role: ${requiredRole} and ownership of Pet ID: ${petId}`,
        'INFO',
        userId,
      )
      next()
    } catch (error) {
      console.error('Error in checkRoleAndOwnership middleware:', error)
      res.status(500).json({ message: 'Internal server error' })
    }
  }
}
