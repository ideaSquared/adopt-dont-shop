import { Response } from 'express'
import {
  getAdminDashboardData,
  getRescueDashboardData,
} from '../services/dashboardService'
import { AuthenticatedRequest } from '../types'

export const getRescueDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const rescueId = req.user?.rescue_id
    if (!rescueId) {
      return res.status(400).json({ message: 'Rescue ID is required' })
    }

    const dashboardData = await getRescueDashboardData(rescueId)
    return res.json(dashboardData)
  } catch (error) {
    console.error('Error fetching rescue dashboard data:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getAdminDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const dashboardData = await getAdminDashboardData()
    return res.json(dashboardData)
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
