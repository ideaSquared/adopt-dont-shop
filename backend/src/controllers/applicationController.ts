import { Response } from 'express'
import * as ApplicationService from '../services/applicationService'
import { AuditLogger } from '../services/auditLogService'
import { AuthenticatedRequest } from '../types'

export const createApplication = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'ApplicationController',
      'Attempting to create new application',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const application = await ApplicationService.createApplication(req.body)

    AuditLogger.logAction(
      'ApplicationController',
      `Successfully created application: ${application.application_id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(201).json(application)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationController',
      `Failed to create application: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error creating application', error })
  }
}

export const getAllApplications = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'ApplicationController',
      'Attempting to fetch all applications',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const applications = await ApplicationService.getAllApplications()

    AuditLogger.logAction(
      'ApplicationController',
      `Successfully fetched ${applications.length} applications`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(200).json(applications)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationController',
      `Failed to fetch applications: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching applications', error })
  }
}

export const getApplicationById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { id } = req.params

  try {
    AuditLogger.logAction(
      'ApplicationController',
      `Attempting to fetch application: ${id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const application = await ApplicationService.getApplicationById(id)

    if (application) {
      AuditLogger.logAction(
        'ApplicationController',
        `Successfully fetched application: ${id}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(200).json(application)
    } else {
      AuditLogger.logAction(
        'ApplicationController',
        `Application not found: ${id}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Application not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationController',
      `Failed to fetch application ${id}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching application', error })
  }
}

export const updateApplication = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { id } = req.params
  const { user } = req

  if (!user || !user.user_id) {
    AuditLogger.logAction(
      'ApplicationController',
      'Unauthorized attempt to update application',
      'WARNING',
      null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    return res.status(403).json({ message: 'Unauthorized' })
  }

  try {
    AuditLogger.logAction(
      'ApplicationController',
      `Attempting to update application: ${id}`,
      'INFO',
      user.user_id,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const updatedApplication = await ApplicationService.updateApplication(
      id,
      req.body,
      user.user_id,
    )

    if (updatedApplication) {
      AuditLogger.logAction(
        'ApplicationController',
        `Successfully updated application: ${id}`,
        'INFO',
        user.user_id,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(200).json(updatedApplication)
    } else {
      AuditLogger.logAction(
        'ApplicationController',
        `Application not found for update: ${id}`,
        'WARNING',
        user.user_id,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Application not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationController',
      `Failed to update application ${id}: ${errorMessage}`,
      'ERROR',
      user.user_id,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error updating application', error })
  }
}

export const deleteApplication = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { id } = req.params

  try {
    AuditLogger.logAction(
      'ApplicationController',
      `Attempting to delete application: ${id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const deleted = await ApplicationService.deleteApplication(id)

    if (deleted) {
      AuditLogger.logAction(
        'ApplicationController',
        `Successfully deleted application: ${id}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(204).end()
    } else {
      AuditLogger.logAction(
        'ApplicationController',
        `Application not found for deletion: ${id}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Application not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationController',
      `Failed to delete application ${id}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error deleting application', error })
  }
}

export const getApplicationsByRescueId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params

  if (!rescueId) {
    AuditLogger.logAction(
      'ApplicationController',
      'Attempt to fetch applications without rescue ID',
      'WARNING',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(400).json({ error: 'Rescue ID is required' })
    return
  }

  try {
    AuditLogger.logAction(
      'ApplicationController',
      `Attempting to fetch applications for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const applications =
      await ApplicationService.getApplicationsByRescueId(rescueId)

    AuditLogger.logAction(
      'ApplicationController',
      `Successfully fetched ${applications.length} applications for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(200).json(applications)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationController',
      `Failed to fetch applications for rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching applications', error })
  }
}
