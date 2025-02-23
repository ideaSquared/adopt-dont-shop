import { Response } from 'express'
import { Op } from 'sequelize'
import { ChatParticipant, Message, MessageReadStatus } from '../Models'
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

    // Find all unread messages in this chat
    const unreadMessages = await Message.findAll({
      where: {
        chat_id: participant.chat_id,
        sender_id: { [Op.ne]: userId },
      },
      include: [
        {
          model: MessageReadStatus,
          as: 'readStatus',
          where: { user_id: userId },
          required: false,
        },
      ],
    })

    const messagesToMark = unreadMessages.filter(
      (message) =>
        !message.readStatus?.some((status) => status.user_id === userId),
    )

    if (messagesToMark.length > 0) {
      const readAt = new Date()

      // Create read status records
      await MessageReadStatus.bulkCreate(
        messagesToMark.map((message) => ({
          message_id: message.message_id,
          user_id: userId,
          read_at: readAt,
        })),
        {
          updateOnDuplicate: ['read_at', 'updated_at'],
        },
      )

      // Emit read status update with correct structure
      SocketService.getInstance().emitReadStatusUpdate(participant.chat_id, {
        user_id: userId,
        message_ids: messagesToMark.map((msg) => msg.message_id),
        read_at: readAt,
      })
    }

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
