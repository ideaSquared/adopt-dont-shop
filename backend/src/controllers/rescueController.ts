// RescueController.ts
import { Response } from 'express'
import {
  getAllRescuesService,
  getRescueStaffWithRoles,
  getSingleRescueService,
  updateRescueService,
  deleteStaffService
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
  const { userId } = req.params

  try {
    await deleteStaffService(userId)
    res.status(200).json({ message: 'Staff member deleted successfully' })
  } catch (error) {
    console.error('Failed to delete staff member:', error)
    res.status(500).json({ message: 'Failed to delete staff member' })
  }
}