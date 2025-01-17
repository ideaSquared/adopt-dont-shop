import { Response } from 'express'
import {
  addRoleToUserService,
  removeRoleFromUserService,
} from '../services/adminService'
import { AuditLogger } from '../services/auditLogService'
import { AuthenticatedRequest } from '../types'

export const addRoleToUserController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { userId } = req.params
  const { role } = req.body

  try {
    // Log attempt
    AuditLogger.logAction(
      'AdminController',
      `Attempting to add role ${role} to user ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'ROLE_MANAGEMENT'),
    )

    await addRoleToUserService(userId, role)

    // Log success
    AuditLogger.logAction(
      'AdminController',
      `Successfully added role ${role} to user ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'ROLE_MANAGEMENT'),
    )
    res.status(200).json({ message: 'Role added successfully' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    // Log failure with specific error
    AuditLogger.logAction(
      'AdminController',
      `Failed to add role ${role} to user ${userId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'ROLE_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to add role' })
  }
}

export const removeRoleFromUserController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { userId, roleId } = req.params

  try {
    // Log attempt
    AuditLogger.logAction(
      'AdminController',
      `Attempting to remove role ${roleId} from user ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'ROLE_MANAGEMENT'),
    )

    await removeRoleFromUserService(userId, roleId)

    // Log success
    AuditLogger.logAction(
      'AdminController',
      `Successfully removed role ${roleId} from user ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'ROLE_MANAGEMENT'),
    )
    res.status(200).json({ message: 'Role removed successfully' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    // Log failure with specific error
    AuditLogger.logAction(
      'AdminController',
      `Failed to remove role ${roleId} from user ${userId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'ROLE_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to remove role' })
  }
}
