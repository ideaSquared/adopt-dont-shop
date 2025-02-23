import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import * as chatService from '../services/chatService'
import { bulkDeleteMessages } from '../services/chatService'
import { getRolesForUser } from '../services/permissionService'
import { AuthenticatedRequest } from '../types'

type ChatStatus = 'active' | 'archived' | 'locked'

// Helper function to check authentication
const checkAuthentication = (
  req: AuthenticatedRequest,
  res: Response,
  action: string,
): string | null => {
  const userId = req.user?.user_id
  if (!userId) {
    AuditLogger.logAction(
      'ChatController',
      `Attempt to ${action} without authentication`,
      'WARNING',
      null,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(401).json({ error: 'Not authenticated' })
    return null
  }
  return userId
}

// Helper function to handle errors
const handleError = (
  error: unknown,
  userId: string,
  action: string,
  identifier: string,
  req: AuthenticatedRequest,
  res: Response,
): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  AuditLogger.logAction(
    'ChatController',
    `Failed to ${action} ${identifier}: ${errorMessage}`,
    'ERROR',
    userId,
    AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
  )

  if (
    errorMessage === 'Chat not found' ||
    errorMessage === 'Message not found'
  ) {
    res.status(404).json({ error: `${identifier} not found` })
  } else {
    res.status(500).json({ error: `Failed to ${action}` })
  }
}

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
  const rescueId = req.params.rescue_id
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

  // Check if status is valid based on user role
  const userRoles = await getRolesForUser(userId)
  const isAdmin = userRoles.includes('admin')
  const validStatuses = isAdmin
    ? ['active', 'locked', 'archived']
    : ['active', 'archived']

  if (!status || !validStatuses.includes(status)) {
    AuditLogger.logAction(
      'ChatController',
      `Invalid status provided: ${status}`,
      'WARNING',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(400).json({
      error: `Invalid status. Must be ${
        isAdmin ? '"active", "locked" or "archived"' : '"active" or "archived"'
      }`,
    })
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
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
      rescueId,
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
    handleError(error, userId, 'update', `chat ${chatId}`, req, res)
  }
}

export const deleteChat = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = checkAuthentication(req, res, 'delete chat')
  if (!userId) return

  const chatId = req.params.chat_id

  try {
    AuditLogger.logAction(
      'ChatController',
      `Attempting to delete chat: ${chatId}`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    await chatService.deleteChat(
      chatId,
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    AuditLogger.logAction(
      'ChatController',
      `Successfully deleted chat: ${chatId}`,
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    res.status(204).send()
  } catch (error) {
    handleError(error, userId, 'delete', `chat ${chatId}`, req, res)
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

export const deleteMessageController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = checkAuthentication(req, res, 'delete message')
  if (!userId) return

  const messageId = req.params.message_id

  try {
    await chatService.deleteMessage(
      messageId,
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(204).send()
  } catch (error) {
    handleError(error, userId, 'delete', `message ${messageId}`, req, res)
  }
}

export const bulkDeleteMessagesController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = checkAuthentication(req, res, 'bulk delete messages')
  if (!userId) return

  const { messageIds } = req.body

  try {
    await bulkDeleteMessages(
      messageIds,
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(204).send()
  } catch (error) {
    handleError(error, userId, 'bulk delete', 'messages', req, res)
  }
}

/**
 * Get conversations for the current user
 */
export const getUserConversations = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = req.user?.user_id

  if (!userId) {
    AuditLogger.logAction(
      'ChatController',
      'Attempt to fetch user conversations without authentication',
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
      'Attempting to fetch user conversations',
      'INFO',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )

    const conversations = await chatService.getAllChatsForUser(userId)

    AuditLogger.logAction(
      'ChatController',
      `Successfully fetched ${conversations.length} conversations for user`,
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
      `Failed to fetch user conversations: ${errorMessage}`,
      'ERROR',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to get conversations' })
  }
}
