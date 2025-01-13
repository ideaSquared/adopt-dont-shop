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
    console.log('attachRescueId - User:', req.user)
    if (req.user) {
      // Fetch rescue_id from staff_members table
      const rescueId = await getRescueIdByUserId(req.user.user_id)
      console.log('attachRescueId - Found rescueId:', rescueId)

      if (!rescueId) {
        return res.status(400).json({
          error:
            'No rescue association found. User must be a staff member of a rescue.',
          details: 'No record found in staff_members table for this user.',
        })
      }

      req.user.rescue_id = rescueId
    } else {
      return res.status(401).json({ error: 'User not authenticated' })
    }
    next()
  } catch (error) {
    console.error('Error attaching rescue_id:', error)
    res.status(500).json({ error: 'Failed to attach rescue_id' })
  }
}
