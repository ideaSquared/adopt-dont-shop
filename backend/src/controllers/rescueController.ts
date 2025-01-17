// RescueController.ts
import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import {
  addRoleToUserService,
  cancelInvitationService,
  deleteRescueService,
  deleteStaffService,
  getAllRescuesService,
  getRescueStaffWithRoles,
  getSingleRescueService,
  inviteUserService,
  removeRoleFromUserService,
  updateRescueService,
} from '../services/rescueService'
import { AuthenticatedRequest } from '../types'

export const getAllRescuesController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    AuditLogger.logAction(
      'RescueController',
      'Attempting to fetch all rescues',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    const rescues = await getAllRescuesService()

    AuditLogger.logAction(
      'RescueController',
      `Successfully fetched ${rescues.length} rescues`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    res.status(200).json(rescues)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to fetch rescues: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error retrieving rescues' })
  }
}

export const getSingleRescueController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params
  const { user } = req

  if (!user) {
    AuditLogger.logAction(
      'RescueController',
      'Attempt to fetch rescue without authentication',
      'WARNING',
      null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    return res.status(401).json({ message: 'Not authenticated' })
  }

  try {
    AuditLogger.logAction(
      'RescueController',
      `Attempting to fetch rescue: ${rescueId}`,
      'INFO',
      user.user_id,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    const rescueData = await getSingleRescueService(rescueId, user)

    if (!rescueData) {
      AuditLogger.logAction(
        'RescueController',
        `Rescue not found: ${rescueId}`,
        'WARNING',
        user.user_id,
        AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
      )
      return res.status(404).json({ message: 'Rescue not found' })
    }

    AuditLogger.logAction(
      'RescueController',
      `Successfully fetched rescue: ${rescueId}`,
      'INFO',
      user.user_id,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    return res.json(rescueData)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to fetch rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      user.user_id,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Server error' })
  }
}

export const updateRescueController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const rescueId = req.params.rescueId

  try {
    AuditLogger.logAction(
      'RescueController',
      `Attempting to update rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    const updatedRescue = await updateRescueService(rescueId, req.body)

    AuditLogger.logAction(
      'RescueController',
      `Successfully updated rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    res.status(200).json(updatedRescue)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to update rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to update rescue' })
  }
}

export const getRescueStaffWithRolesController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params

  try {
    AuditLogger.logAction(
      'RescueController',
      `Attempting to fetch staff with roles for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    const staffWithRoles = await getRescueStaffWithRoles(rescueId)

    if (!staffWithRoles) {
      AuditLogger.logAction(
        'RescueController',
        `No staff found for rescue: ${rescueId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
      )
      return res.status(404).json({ message: 'Rescue or staff not found' })
    }

    AuditLogger.logAction(
      'RescueController',
      `Successfully fetched staff with roles for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    return res.json(staffWithRoles)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to fetch staff with roles for rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteStaffController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { userId, rescueId } = req.params

  try {
    AuditLogger.logAction(
      'RescueController',
      `Attempting to delete staff member ${userId} from rescue ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    await deleteStaffService(userId, rescueId)

    AuditLogger.logAction(
      'RescueController',
      `Successfully deleted staff member ${userId} from rescue ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    res.status(200).json({ message: 'Staff member deleted successfully' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to delete staff member ${userId} from rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to delete staff member' })
  }
}

export const inviteUserController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { email, rescueId } = req.body

  try {
    AuditLogger.logAction(
      'RescueController',
      `Attempting to invite user ${email} to rescue ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    await inviteUserService(email, rescueId)

    AuditLogger.logAction(
      'RescueController',
      `Successfully invited user ${email} to rescue ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    res.status(200).json({ message: 'Invitation sent successfully' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to invite user ${email} to rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to send invitation' })
  }
}

export const cancelInvitationController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { email, rescueId } = req.body

  try {
    AuditLogger.logAction(
      'RescueController',
      `Attempting to cancel invitation for user ${email} from rescue ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    await cancelInvitationService(email, rescueId)

    AuditLogger.logAction(
      'RescueController',
      `Successfully cancelled invitation for user ${email} from rescue ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    res.status(200).json({ message: 'Invitation canceled successfully' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to cancel invitation for user ${email} from rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    res.status(400).json({ message: 'Failed to cancel invitation', error })
  }
}

export const addRoleToUserController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { userId } = req.params
  const { role } = req.body

  try {
    AuditLogger.logAction(
      'RescueController',
      `Attempting to add role ${role} to user ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    await addRoleToUserService(userId, role)

    AuditLogger.logAction(
      'RescueController',
      `Successfully added role ${role} to user ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    res.status(200).json({ message: 'Role added successfully' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to add role ${role} to user ${userId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to add role' })
  }
}

export const removeRoleFromUserController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { userId, roleId } = req.params

  try {
    AuditLogger.logAction(
      'RescueController',
      `Attempting to remove role ${roleId} from user ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    await removeRoleFromUserService(userId, roleId)

    AuditLogger.logAction(
      'RescueController',
      `Successfully removed role ${roleId} from user ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    res.status(200).json({ message: 'Role removed successfully' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to remove role ${roleId} from user ${userId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to remove role' })
  }
}

export const deleteRescueController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { rescueId } = req.params

  try {
    AuditLogger.logAction(
      'RescueController',
      `Attempting to delete rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    await deleteRescueService(rescueId)

    AuditLogger.logAction(
      'RescueController',
      `Successfully deleted rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )

    res.status(200).json({ message: 'Rescue deleted successfully' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueController',
      `Failed to delete rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RESCUE_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to delete rescue' })
  }
}
