import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import * as conversationService from '../services/conversationService'
import { AuthenticatedRequest } from '../types'

export const getAllConversationsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'ConversationController',
      'Attempting to fetch all conversations',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'CONVERSATION_MANAGEMENT'),
    )

    const conversations = await conversationService.getAllConversations()

    AuditLogger.logAction(
      'ConversationController',
      `Successfully fetched ${conversations.length} conversations`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'CONVERSATION_MANAGEMENT'),
    )

    res.status(200).json(conversations)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ConversationController',
      `Failed to fetch conversations: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'CONVERSATION_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}
