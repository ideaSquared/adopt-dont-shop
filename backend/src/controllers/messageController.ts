import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { Message, User } from '../Models'
import { Chat } from '../Models/Chat'
import { MessageAttachment } from '../Models/Message'
import { AuditLogger } from '../services/auditLogService'
import { FileUploadService } from '../services/fileUploadService'
import * as messageService from '../services/messageService'
import { getRolesForUser } from '../services/permissionService'
import { getRescueIdByUserId } from '../services/rescueService'
import SocketService from '../services/socketService'
import { AuthenticatedRequest } from '../types'

// Add interface for socket notifications
interface MessageDeletedEvent {
  message_id: string
  chat_id: string
}

interface MessageSearchResult {
  message: Message
  sender: User | null
  rank: number
}

// Remove the id method from Message class
delete (Message as any).prototype.id

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

    const messages =
      (await messageService.getMessagesByConversationId(conversationId)) || []

    if (messages.length > 0) {
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
      res.status(404).json({ message: 'No messages found' })
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

export const getAllMessages = async (req: Request, res: Response) => {
  try {
    const chatId = req.params.chat_id
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100) // Max 100 messages per request
    const cursor = req.query.cursor as string // Message ID to start from
    const direction = (req.query.direction as string) || 'older' // 'older' or 'newer'

    let whereClause: any = { chat_id: chatId }
    if (cursor) {
      whereClause.message_id =
        direction === 'older' ? { [Op.lt]: cursor } : { [Op.gt]: cursor }
    }

    const messages = await Message.findAll({
      where: whereClause,
      limit,
      order:
        direction === 'older'
          ? [['message_id', 'DESC']]
          : [['message_id', 'ASC']],
      include: ['User'],
    })

    // Get the next cursor
    const nextCursor =
      messages.length === limit
        ? messages[messages.length - 1].message_id
        : null

    // If fetching newer messages, reverse the array to maintain chronological order
    if (direction === 'newer') {
      messages.reverse()
    }

    res.json({
      messages,
      nextCursor,
      hasMore: nextCursor !== null,
    })
  } catch (error) {
    AuditLogger.logAction(
      'Message',
      `Failed to get messages: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to get messages' })
  }
}

export const createMessage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { chat_id, content, content_format } = req.body
    const sender_id = req.user?.user_id

    if (!sender_id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    let attachments: MessageAttachment[] = []

    // Handle file uploads if present
    if (req.files && Array.isArray(req.files)) {
      attachments = await Promise.all(
        req.files.map(async (file) => {
          const uploadResult = await FileUploadService.uploadFile(file)
          return {
            attachment_id: uploadResult.attachment_id,
            filename: uploadResult.filename,
            originalName: uploadResult.originalName,
            mimeType: uploadResult.mimeType,
            size: uploadResult.size,
            url: uploadResult.url,
          }
        }),
      )
    }

    const message = await Message.create({
      chat_id,
      sender_id,
      content,
      content_format: content_format || 'plain',
      attachments,
    })

    // Load sender information
    const messageWithSender = await Message.findByPk(message.message_id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['user_id', 'first_name', 'last_name'],
        },
      ],
    })

    // Notify other participants
    SocketService.emitToChat(chat_id, 'new_message', messageWithSender)

    res.status(201).json(messageWithSender)
  } catch (error) {
    AuditLogger.logAction(
      'Message',
      `Failed to create message: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to create message' })
  }
}

export const updateMessage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const messageId = req.params.message_id
    const { content, content_format } = req.body
    const userId = req.user?.user_id

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const message = await Message.findByPk(messageId)

    if (!message) {
      return res.status(404).json({ error: 'Message not found' })
    }

    if (message.sender_id !== userId) {
      return res
        .status(403)
        .json({ error: 'Not authorized to edit this message' })
    }

    await message.update({
      content,
      content_format: content_format || message.content_format,
    })

    // Load updated message with sender information
    const updatedMessage = await Message.findByPk(messageId, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['user_id', 'first_name', 'last_name'],
        },
      ],
    })

    // Notify other participants
    SocketService.emitToChat(message.chat_id, 'message_updated', updatedMessage)

    res.json(updatedMessage)
  } catch (error) {
    AuditLogger.logAction(
      'Message',
      `Failed to update message: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to update message' })
  }
}

export const deleteMessage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const messageId = req.params.message_id
    const userId = req.user?.user_id

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: Chat,
          as: 'Chat',
        },
      ],
    })

    if (!message) {
      return res.status(404).json({ error: 'Message not found' })
    }

    // Check if user is a rescue manager and if the chat belongs to their rescue
    const userRoles = await getRolesForUser(userId)
    const userRescueId = await getRescueIdByUserId(userId)
    const isRescueManager = userRoles.includes('rescue_manager')
    const canDeleteAsRescue =
      isRescueManager &&
      userRescueId &&
      message.Chat?.rescue_id === userRescueId

    // Allow deletion if user is the sender or a rescue manager of the chat's rescue
    if (message.sender_id !== userId && !canDeleteAsRescue) {
      return res
        .status(403)
        .json({ error: 'Not authorized to delete this message' })
    }

    // Delete associated files if any
    if (message.attachments && message.attachments.length > 0) {
      await Promise.all(
        message.attachments.map((attachment: MessageAttachment) =>
          FileUploadService.deleteFile(attachment.filename),
        ),
      )
    }

    const chatId = message.chat_id
    const deletedMessageId = message.message_id
    await message.destroy()

    // Notify other participants with proper type
    const notification: MessageDeletedEvent = {
      message_id: deletedMessageId,
      chat_id: chatId,
    }
    SocketService.emitToChat(chatId, 'message_deleted', notification)

    res.status(204).send()
  } catch (error) {
    AuditLogger.logAction(
      'Message',
      `Failed to delete message: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to delete message' })
  }
}

export const deleteAttachment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const messageId = req.params.message_id
    const attachmentId = req.params.attachment_id
    const userId = req.user?.user_id

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const message = await Message.findByPk(messageId)

    if (!message) {
      return res.status(404).json({ error: 'Message not found' })
    }

    if (message.sender_id !== userId) {
      return res
        .status(403)
        .json({ error: 'Not authorized to modify this message' })
    }

    // Find the attachment
    const existingAttachment = message.attachments?.find(
      (a) => a.attachment_id === attachmentId,
    )

    if (!existingAttachment) {
      return res.status(404).json({ error: 'Attachment not found' })
    }

    // Delete the file
    await FileUploadService.deleteFile(existingAttachment.filename)

    // Update message attachments
    const remainingAttachments = message.attachments?.filter(
      (a) => a.attachment_id !== attachmentId,
    )
    await message.update({ attachments: remainingAttachments })

    // Notify other participants
    SocketService.emitToChat(message.chat_id, 'message_updated', message)

    res.status(204).send()
  } catch (error) {
    AuditLogger.logAction(
      'Message',
      `Failed to delete attachment: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to delete attachment' })
  }
}

// Fix the search results handling
export const searchMessages = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string
    const chatId = req.params.chat_id
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    const results = await Message.searchMessages(query, chatId, limit, offset)

    // Fetch sender details for each message
    const messagesWithSenders = await Promise.all(
      results.map(async (message: Message): Promise<MessageSearchResult> => {
        const messageWithSender = await Message.findByPk(message.message_id, {
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['user_id', 'first_name', 'last_name', 'email'],
            },
          ],
        })
        return {
          message,
          sender: messageWithSender?.get('User') as User | null,
          rank: (message as any).rank || 0,
        }
      }),
    )

    AuditLogger.logAction(
      'Message',
      `Search performed: "${query}" returned ${results.length} results`,
      'INFO',
    )

    res.json({
      results: messagesWithSenders,
      total: results.length,
      hasMore: results.length === limit,
    })
  } catch (error) {
    AuditLogger.logAction(
      'Message',
      `Search failed: ${(error as Error).message}`,
      'ERROR',
    )
    res.status(500).json({ error: 'Failed to search messages' })
  }
}
