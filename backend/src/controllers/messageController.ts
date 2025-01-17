import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import * as messageService from '../services/messageService'
import { AuthenticatedRequest } from '../types'

export const getAllMessagesController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'MessageController',
      'Attempting to fetch all messages',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )

    const messages = await messageService.getAllMessages()

    AuditLogger.logAction(
      'MessageController',
      `Successfully fetched ${messages.length} messages`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )

    res.status(200).json(messages)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'MessageController',
      `Failed to fetch messages: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const getMessageByIdController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { id } = req.params

  try {
    AuditLogger.logAction(
      'MessageController',
      `Attempting to fetch message: ${id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )

    const message = await messageService.getMessageById(id)

    if (message) {
      AuditLogger.logAction(
        'MessageController',
        `Successfully fetched message: ${id}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
      )
      res.status(200).json(message)
    } else {
      AuditLogger.logAction(
        'MessageController',
        `Message not found: ${id}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Message not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'MessageController',
      `Failed to fetch message ${id}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const getMessagesByConversationIdController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { conversationId } = req.params

  try {
    AuditLogger.logAction(
      'MessageController',
      `Attempting to fetch messages for conversation: ${conversationId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )

    const messages = await messageService.getMessagesByConversationId(
      conversationId,
    )

    if (messages) {
      AuditLogger.logAction(
        'MessageController',
        `Successfully fetched ${messages.length} messages for conversation: ${conversationId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
      )
      res.status(200).json(messages)
    } else {
      AuditLogger.logAction(
        'MessageController',
        `No messages found for conversation: ${conversationId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Message not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'MessageController',
      `Failed to fetch messages for conversation ${conversationId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const createMessageController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'MessageController',
      'Attempting to create new message',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )

    const message = await messageService.createMessage(req.body)

    AuditLogger.logAction(
      'MessageController',
      `Successfully created message: ${message.message_id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )

    res.status(201).json(message)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'MessageController',
      `Failed to create message: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'MESSAGE_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}
