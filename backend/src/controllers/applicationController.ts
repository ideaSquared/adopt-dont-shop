import { Response } from 'express'
import * as ApplicationService from '../services/applicationService'
import { AuthenticatedRequest } from '../types'

export const createApplication = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const application = await ApplicationService.createApplication(req.body)
    res.status(201).json(application)
  } catch (error) {
    res.status(500).json({ message: 'Error creating application', error })
  }
}

export const getAllApplications = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const applications = await ApplicationService.getAllApplications()
    res.status(200).json(applications)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications', error })
  }
}

export const getApplicationById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params
    const application = await ApplicationService.getApplicationById(id)
    if (application) {
      res.status(200).json(application)
    } else {
      res.status(404).json({ message: 'Application not found' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching application', error })
  }
}

export const updateApplication = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params
    const { user } = req // Get the user object from the request
    if (!user || !user.user_id) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const updatedApplication = await ApplicationService.updateApplication(
      id,
      req.body,
      user.user_id, // Pass the user_id to the service
    )

    if (updatedApplication) {
      res.status(200).json(updatedApplication)
    } else {
      res.status(404).json({ message: 'Application not found' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating application', error })
  }
}

export const deleteApplication = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params
    const deleted = await ApplicationService.deleteApplication(id)
    if (deleted) {
      res.status(204).end()
    } else {
      res.status(404).json({ message: 'Application not found' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting application', error })
  }
}

export const getApplicationsByRescueId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { rescueId } = req.params
    if (!rescueId) {
      res.status(400).json({ error: 'Rescue ID is required' })
      return
    }
    const applications = await ApplicationService.getApplicationsByRescueId(
      rescueId,
    )
    res.status(200).json(applications)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications', error })
  }
}
