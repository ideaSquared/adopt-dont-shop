import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import * as participantService from '../services/participantService'
import { AuthenticatedRequest } from '../types'

export const getAllParticipantsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'ParticipantController',
      'Attempting to fetch all participants',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
    )

    const participants = await participantService.getAllParticipants()

    AuditLogger.logAction(
      'ParticipantController',
      `Successfully fetched ${participants.length} participants`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
    )

    res.status(200).json(participants)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ParticipantController',
      `Failed to fetch participants: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const getParticipantByIdController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { id } = req.params

  try {
    AuditLogger.logAction(
      'ParticipantController',
      `Attempting to fetch participant: ${id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
    )

    const participant = await participantService.getParticipantById(id)

    if (participant) {
      AuditLogger.logAction(
        'ParticipantController',
        `Successfully fetched participant: ${id}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
      )
      res.status(200).json(participant)
    } else {
      AuditLogger.logAction(
        'ParticipantController',
        `Participant not found: ${id}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Participant not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ParticipantController',
      `Failed to fetch participant ${id}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const createParticipantController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'ParticipantController',
      'Attempting to create new participant',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
    )

    const participant = await participantService.createParticipant(req.body)

    AuditLogger.logAction(
      'ParticipantController',
      `Successfully created participant: ${participant.participant_id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
    )

    res.status(201).json(participant)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ParticipantController',
      `Failed to create participant: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PARTICIPANT_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}
