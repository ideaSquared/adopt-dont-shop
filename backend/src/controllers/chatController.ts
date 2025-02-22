import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import * as chatService from '../services/chatService'
import { AuthenticatedRequest } from '../types'

type ChatStatus = 'active' | 'archived'

export const createChat = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { application_id, user_id } = req.body
  const rescue_id = req.user?.user_id

  if (!rescue_id) {
    AuditLogger.logAction(
      'ChatController',
      'Attempt to create chat without authentication',
      'WARNING',
      null,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  try {
    AuditLogger.logAction(
      'ChatController',
      `Attempting to create chat for application: ${application_id}`,
      'INFO',
      rescue_id,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    const chat = await chatService.createChat(
      application_id,
      user_id,
      rescue_id,
    )

    AuditLogger.logAction(
      'ChatController',
      `Successfully created chat with ID: ${chat.chat_id}`,
      'INFO',
      rescue_id,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    res.status(201).json(chat)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ChatController',
      `Failed to create chat: ${errorMessage}`,
      'ERROR',
      rescue_id,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to create chat' })
  }
}

export const getAllChats = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = req.user?.user_id

  if (!userId) {
    AuditLogger.logAction(
      'ChatController',
      'Attempt to fetch chats without authentication',
      'WARNING',
      null,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  try {
    AuditLogger.logAction(
      'ChatController',
      'Attempting to fetch all chats for user',
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    const chats = await chatService.getAllChatsForUser(userId)

    AuditLogger.logAction(
      'ChatController',
      `Successfully fetched ${chats.length} chats`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    res.json(chats)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ChatController',
      `Failed to fetch chats: ${errorMessage}`,
      'ERROR',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to get chats' })
  }
}

export const getChatById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = req.user?.user_id
  const chatId = req.params.chat_id

  if (!userId) {
    AuditLogger.logAction(
      'ChatController',
      'Attempt to fetch chat without authentication',
      'WARNING',
      null,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  try {
    AuditLogger.logAction(
      'ChatController',
      `Attempting to fetch chat: ${chatId}`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    const chat = await chatService.getChatById(chatId)

    if (!chat) {
      AuditLogger.logAction(
        'ChatController',
        `Chat not found: ${chatId}`,
        'WARNING',
        userId,
        AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
      )
      res.status(404).json({ error: 'Chat not found' })
      return
    }

    AuditLogger.logAction(
      'ChatController',
      `Successfully fetched chat: ${chatId}`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    res.json(chat)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ChatController',
      `Failed to fetch chat ${chatId}: ${errorMessage}`,
      'ERROR',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to get chat' })
  }
}

export const updateChat = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = req.user?.user_id
  const chatId = req.params.chat_id
  const { status } = req.body

  if (!userId) {
    AuditLogger.logAction(
      'ChatController',
      'Attempt to update chat without authentication',
      'WARNING',
      null,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  if (!status || !['active', 'archived'].includes(status)) {
    AuditLogger.logAction(
      'ChatController',
      `Invalid status provided: ${status}`,
      'WARNING',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res
      .status(400)
      .json({ error: 'Invalid status. Must be "active" or "archived"' })
    return
  }

  try {
    AuditLogger.logAction(
      'ChatController',
      `Attempting to update chat ${chatId} status to: ${status}`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    const chat = await chatService.updateChatStatus(
      chatId,
      status as ChatStatus,
    )

    AuditLogger.logAction(
      'ChatController',
      `Successfully updated chat ${chatId} status to: ${status}`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    res.json(chat)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ChatController',
      `Failed to update chat ${chatId}: ${errorMessage}`,
      'ERROR',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    if (errorMessage === 'Chat not found') {
      res.status(404).json({ error: 'Chat not found' })
    } else {
      res.status(500).json({ error: 'Failed to update chat' })
    }
  }
}

export const deleteChat = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = req.user?.user_id
  const chatId = req.params.chat_id

  if (!userId) {
    AuditLogger.logAction(
      'ChatController',
      'Attempt to delete chat without authentication',
      'WARNING',
      null,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  try {
    AuditLogger.logAction(
      'ChatController',
      `Attempting to delete chat: ${chatId}`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    await chatService.deleteChat(chatId)

    AuditLogger.logAction(
      'ChatController',
      `Successfully deleted chat: ${chatId}`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    res.status(204).send()
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ChatController',
      `Failed to delete chat ${chatId}: ${errorMessage}`,
      'ERROR',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    if (errorMessage === 'Chat not found') {
      res.status(404).json({ error: 'Chat not found' })
    } else {
      res.status(500).json({ error: 'Failed to delete chat' })
    }
  }
}

/**
 * Get all conversations (admin only)
 */
export const getAllConversationsAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = req.user?.user_id

  if (!userId) {
    AuditLogger.logAction(
      'ChatController',
      'Attempt to fetch all conversations without authentication',
      'WARNING',
      null,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  try {
    AuditLogger.logAction(
      'ChatController',
      'Attempting to fetch all conversations (admin)',
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    const conversations = await chatService.getAllConversations()

    AuditLogger.logAction(
      'ChatController',
      `Successfully fetched ${conversations.length} conversations`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    res.json(conversations)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ChatController',
      `Failed to fetch conversations: ${errorMessage}`,
      'ERROR',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to get conversations' })
  }
}

export const getChatsByRescueId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    console.log('ChatController: Request received', {
      user: req.user,
      headers: req.headers,
    })

    const rescueId = req.user?.rescue_id

    if (!rescueId) {
      console.log('ChatController: No rescue_id found in user object', req.user)
      AuditLogger.logAction(
        'ChatController',
        'Attempt to fetch rescue chats without rescue ID',
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
      )
      return res.status(400).json({ error: 'Rescue ID is required' })
    }

    console.log('ChatController: Fetching chats for rescue:', rescueId)
    const chats = await chatService.getChatsByRescueId(rescueId)
    console.log('ChatController: Found chats:', {
      count: chats.length,
      chatIds: chats.map((c) => c.chat_id),
    })

    AuditLogger.logAction(
      'ChatController',
      `Successfully fetched ${chats.length} chats for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    // Force fresh response
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    res.status(200).json(chats)
  } catch (error) {
    console.error('ChatController: Error fetching chats for rescue:', error)
    AuditLogger.logAction(
      'ChatController',
      `Failed to fetch chats for rescue: ${(error as Error).message}`,
      'ERROR',
      req.user?.user_id,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to fetch chats' })
  }
}
