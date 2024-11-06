// RescueController.ts
import { Response } from 'express'
import {
  getAllRescuesService,
  getSingleRescueService,
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
