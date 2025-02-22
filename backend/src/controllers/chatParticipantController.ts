import { Response } from 'express'
import { ChatParticipant } from '../Models'
import { AuditLogger } from '../services/auditLogService'
import SocketService from '../services/socketService'
import { AuthenticatedRequest } from '../types'

export const getAllParticipants = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const chatId = req.params.chat_id

    const participants = await ChatParticipant.findAll({
      where: { chat_id: chatId },
      include: ['participant'], // Include user details
    })

    res.json(participants)
  } catch (error) {
    AuditLogger.logAction(
      'ChatParticipant',
      `Failed to get participants: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to get participants' })
  }
}

export const createParticipant = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const chatId = req.params.chat_id
    const { participant_id, role } = req.body

    // Check if participant already exists in chat
    const existingParticipant = await ChatParticipant.findOne({
      where: {
        chat_id: chatId,
        participant_id,
      },
    })

    if (existingParticipant) {
      return res
        .status(400)
        .json({ error: 'Participant already exists in chat' })
    }

    const participant = await ChatParticipant.create({
      chat_id: chatId,
      participant_id,
      role,
    })

    // Fetch the created participant with user details
    const participantWithUser = await ChatParticipant.findByPk(
      participant.chat_participant_id,
      {
        include: ['participant'],
      },
    )

    // Emit participant joined event
    SocketService.getInstance().emitParticipantUpdate(chatId, {
      type: 'joined',
      participant: participantWithUser,
    })

    AuditLogger.logAction(
      'ChatParticipant',
      `Participant added to chat ${chatId}`,
      'INFO',
    )

    res.status(201).json(participantWithUser)
  } catch (error) {
    AuditLogger.logAction(
      'ChatParticipant',
      `Failed to create participant: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to create participant' })
  }
}

export const updateLastRead = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const participantId = parseInt(req.params.participant_id)
    const userId = req.user?.user_id

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const participant = await ChatParticipant.findByPk(participantId)

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    // Only allow participants to update their own last_read_at
    if (participant.participant_id !== userId) {
      return res
        .status(403)
        .json({ error: 'Not authorized to update this participant' })
    }

    await participant.update({ last_read_at: new Date() })

    // Emit read status update
    SocketService.getInstance().emitReadStatusUpdate(participant.chat_id, {
      participant_id: participant.participant_id,
      last_read_at: participant.last_read_at,
    })

    AuditLogger.logAction(
      'ChatParticipant',
      `Last read timestamp updated for participant ${participantId}`,
      'INFO',
    )

    res.json(participant)
  } catch (error) {
    AuditLogger.logAction(
      'ChatParticipant',
      `Failed to update last read: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to update last read timestamp' })
  }
}

export const deleteParticipant = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const participantId = req.params.participant_id
    const userId = req.user?.user_id

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const participant = await ChatParticipant.findByPk(participantId, {
      include: ['participant'],
    })

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    // Only allow participants to remove themselves
    if (participant.participant_id !== userId) {
      return res
        .status(403)
        .json({ error: 'Not authorized to remove this participant' })
    }

    const chatId = participant.chat_id
    await participant.destroy()

    // Emit participant left event
    SocketService.getInstance().emitParticipantUpdate(chatId, {
      type: 'left',
      participant_id: participant.participant_id,
    })

    AuditLogger.logAction(
      'ChatParticipant',
      `Participant ${participantId} removed from chat`,
      'INFO',
    )

    res.status(204).send()
  } catch (error) {
    AuditLogger.logAction(
      'ChatParticipant',
      `Failed to delete participant: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to delete participant' })
  }
}
