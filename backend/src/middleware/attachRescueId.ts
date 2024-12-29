import { NextFunction, Response } from 'express'
import { getRescueIdByUserId } from '../services/rescueService'
import { AuthenticatedRequest } from '../types/AuthenticatedRequest'

// Middleware to attach `rescue_id` to authenticated requests
export const attachRescueId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user) {
      // Assume a database/service call to fetch rescue_id
      const rescueId = await getRescueIdByUserId(req.user.user_id) // Replace with actual logic
      req.user.rescue_id = rescueId
    }
    next()
  } catch (error) {
    console.error('Error attaching rescue_id:', error)
    res.status(500).json({ error: 'Failed to attach rescue_id' })
  }
}
