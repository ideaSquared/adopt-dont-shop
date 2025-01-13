import { Response } from 'express'
import {
  addRoleToUserService,
  removeRoleFromUserService,
} from '../services/adminService'
import { AuthenticatedRequest } from '../types'

export const addRoleToUserController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { userId } = req.params
  const { role } = req.body

  try {
    await addRoleToUserService(userId, role)
    res.status(200).json({ message: 'Role added successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to add role' })
  }
}

export const removeRoleFromUserController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { userId, roleId } = req.params

  try {
    await removeRoleFromUserService(userId, roleId)
    res.status(200).json({ message: 'Role removed successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove role' })
  }
}
