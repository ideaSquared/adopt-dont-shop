// RescueController.ts
import { Response } from 'express'
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
    const rescues = await getAllRescuesService()
    res.status(200).json(rescues)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error retrieving rescues' })
  }
}

export const getSingleRescueController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params
  const { user } = req

  if (!user) return

  try {
    const rescueData = await getSingleRescueService(rescueId, user)

    if (!rescueData) {
      return res.status(404).json({ message: 'Rescue not found' })
    }

    return res.json(rescueData)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const updateRescueController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const rescueId = req.params.rescueId
    const updatedData = req.body
    const updatedRescue = await updateRescueService(rescueId, updatedData)
    res.status(200).json(updatedRescue)
  } catch (error) {
    console.error('Failed to update rescue:', error)
    res.status(500).json({ error: 'Failed to update rescue' })
  }
}

export const getRescueStaffWithRolesController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params

  try {
    const staffWithRoles = await getRescueStaffWithRoles(rescueId)

    if (!staffWithRoles) {
      return res.status(404).json({ message: 'Rescue or staff not found' })
    }

    return res.json(staffWithRoles)
  } catch (error) {
    console.error('Failed to get rescue staff with roles:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteStaffController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { userId, rescueId } = req.params

  try {
    await deleteStaffService(userId, rescueId)
    res.status(200).json({ message: 'Staff member deleted successfully' })
  } catch (error) {
    console.error('Failed to delete staff member:', error)
    res.status(500).json({ message: 'Failed to delete staff member' })
  }
}

export const inviteUserController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { email, rescueId } = req.body

  try {
    await inviteUserService(email, rescueId)
    res.status(200).json({ message: 'Invitation sent successfully' })
  } catch (error) {
    console.error('Failed to send invitation:', error)
    res.status(500).json({ message: 'Failed to send invitation' })
  }
}

export const cancelInvitationController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { email, rescueId } = req.body

  try {
    await cancelInvitationService(email, rescueId)
    res.status(200).json({ message: 'Invitation canceled successfully' })
  } catch (error) {
    res.status(400).json({ message: 'Failed to cancel invitation', error })
  }
}

// Controller to add a role to a user
export const addRoleToUserController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { userId } = req.params
  const { role } = req.body

  try {
    await addRoleToUserService(userId, role)
    res.status(200).json({ message: 'Role added successfully' })
  } catch (error) {
    console.error('Failed to add role:', error)
    res.status(500).json({ message: 'Failed to add role' })
  }
}

// Controller to remove a role from a user
export const removeRoleFromUserController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { userId, roleId } = req.params

  try {
    await removeRoleFromUserService(userId, roleId)
    res.status(200).json({ message: 'Role removed successfully' })
  } catch (error) {
    console.error('Failed to remove role:', error)
    res.status(500).json({ message: 'Failed to remove role' })
  }
}

export const deleteRescueController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { rescueId } = req.params

  try {
    await deleteRescueService(rescueId)
    res.status(200).json({ message: 'Rescue deleted successfully' })
  } catch (error) {
    console.error('Failed to delete rescue:', error)
    res.status(500).json({ message: 'Failed to delete rescue' })
  }
}
