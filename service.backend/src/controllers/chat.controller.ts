import { Request, Response } from 'express';
import { ChatParticipant } from '../models/ChatParticipant';
import User, { UserType } from '../models/User';
import { ChatService } from '../services/chat.service';
import { FileUploadService } from '../services/file-upload.service';
import { ChatMessage } from '../types/chat';
import { logger, loggerHelpers } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: User;
}

// Interface for messages with populated Sender
interface MessageWithSender extends ChatMessage {
  Sender?: User | { firstName?: string; lastName?: string; first_name?: string; last_name?: string };
  sender_name?: string;
}

/**
 * Safely extract full name from a User object or serialized user data
 * Handles both Sequelize model instances and plain objects (from toJSON)
 */
const getUserFullName = (user: User | { firstName?: string; lastName?: string; first_name?: string; last_name?: string; getFullName?: () => string } | undefined | null): string => {
  if (!user) {
    return 'Unknown User';
  }

  // If it's a User model instance with getFullName method, use it
  if (typeof (user as any).getFullName === 'function') {
    return (user as User).getFullName() || 'Unknown User';
  }

  // Otherwise extract from properties (handles both camelCase and snake_case)
  const firstName = (user as any).firstName || (user as any).first_name || '';
  const lastName = (user as any).lastName || (user as any).last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || 'Unknown User';
};

export class ChatController {
  /**
   * Create a new chat conversation
   */
  static async createChat(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const { rescueId, petId, applicationId, type, initialMessage } = req.body;
      const createdBy = req.user!.userId;

      // Create participant IDs array: start with the user who created the chat
      const participantIds = [createdBy];

      // If there's a rescue involved, add the rescue staff users as participants
      if (rescueId && rescueId !== createdBy) {
        try {
          // Find users who belong to this rescue
          const rescueUsers = await User.findAll({
            where: { rescueId: rescueId },
            attributes: ['userId'],
          });

          // Add rescue staff user IDs to participants (avoid duplicates)
          rescueUsers.forEach(user => {
            if (!participantIds.includes(user.userId)) {
              participantIds.push(user.userId);
            }
          });
        } catch (error) {
          logger.error('Error finding rescue users:', error);
          // Continue with chat creation even if we can't find rescue users
        }
      }

      const chat = await ChatService.createChat(
        {
          participantIds,
          rescueId,
          applicationId,
          petId,
          type: type || 'application',
          initialMessage,
        },
        createdBy
      );

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      // Format the response to match frontend Conversation interface expectations
      const response = {
        id: chat.chat_id,
        userId: createdBy, // The user who created the chat
        rescueId: chat.rescue_id,
        petId: chat.pet_id,
        applicationId: chat.application_id,
        type: type || 'application',
        status: chat.status,
        participants: [], // Will be populated by frontend when needed
        unreadCount: 0, // New conversation starts with 0 unread
        isTyping: [], // Empty initially
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        // Keep backward compatibility fields
        chat_id: chat.chat_id,
        rescue_id: chat.rescue_id,
        pet_id: chat.pet_id,
        application_id: chat.application_id,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Error creating chat:', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to create chat',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get chat by ID
   */
  static async getChatById(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const userId = req.user!.userId;

      const chat = await ChatService.getChatById(chatId, userId);

      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
        });
      }

      const chatObj = chat.toJSON();

      // Transform participants to match frontend Participant interface
      const participants =
        chatObj.Participants?.map((p: any) => ({
          id: p.participant_id,
          name: getUserFullName(p.User),
          type: p.role === 'admin' ? 'admin' : 'user',
          avatarUrl: p.User?.profileImageUrl,
          isOnline: false,
        })) || [];

      // Transform to match frontend Conversation interface
      const transformedChat = {
        id: chatObj.chat_id,
        chat_id: chatObj.chat_id,
        participants,
        unreadCount: 0, // TODO: Calculate unread count
        updatedAt: chatObj.updated_at,
        createdAt: chatObj.created_at,
        isActive: chatObj.status === 'active',
        petId: chatObj.pet_id,
        rescueId: chatObj.rescue_id,
        rescueName: chatObj.rescue?.name || null,
        status: chatObj.status,
        metadata: {},
      };

      res.json({
        success: true,
        data: transformedChat,
      });
    } catch (error) {
      logger.error('Error getting chat:', error);
      if (error instanceof Error && error.message === 'Chat not found') {
        return res.status(404).json({
          error: 'Chat not found',
        });
      }
      res.status(500).json({
        error: 'Failed to get chat',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search and list chats for the authenticated user
   */
  static async getChats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const userType = req.user!.userType;
      const rescueId = req.user!.rescueId;
      const {
        petId,
        type,
        page = 1,
        limit = 20,
        sortBy = 'updated_at',
        sortOrder = 'DESC',
      } = req.query;

      // Admin users can see all chats, regular users only see chats they're participants in
      const isAdmin = userType === UserType.ADMIN;
      const searchOptions = {
        userId: isAdmin ? undefined : userId,
        rescueId: isAdmin ? undefined : rescueId || undefined,
        petId: petId as string,
        type: type as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      };

      const result = await ChatService.searchChats(searchOptions);

      logger.info('Chat search results', {
        isAdmin,
        userId: isAdmin ? 'undefined (admin)' : userId,
        rescueId: isAdmin ? 'undefined (admin)' : rescueId,
        totalChats: result.chats.length,
        totalCount: result.pagination.total,
      });

      // Add rescueName and lastMessage to each chat in the response
      const chatsWithRescueName = result.chats.map(chat => {
        const chatObj = chat.toJSON();
        // Get the latest message (should be first in Messages array due to DESC order)
        let lastMessage = null;
        if (Array.isArray(chatObj.Messages) && chatObj.Messages.length > 0) {
          const msg = chatObj.Messages[0];
          lastMessage = {
            id: msg.message_id,
            content:
              typeof msg.content === 'string' && msg.content.length > 120
                ? msg.content.slice(0, 120) + '...'
                : msg.content,
            senderId: msg.sender_id,
            createdAt: msg.created_at,
            // Add more fields if needed
          };
        }

        // Transform participants to match frontend Participant interface
        const participants =
          chatObj.Participants?.map((p: any) => ({
            id: p.participant_id,
            name: getUserFullName(p.User),
            type: p.role === 'admin' ? 'admin' : 'user',
            avatarUrl: p.User?.profileImageUrl,
            isOnline: false, // TODO: Implement online status
          })) || [];

        return {
          id: chatObj.chat_id,
          userId: undefined, // No user_id field in chat model
          rescueId: chatObj.rescue_id,
          petId: chatObj.pet_id,
          applicationId: chatObj.application_id,
          type: 'general', // Default type since not in model
          status: chatObj.status,
          participants,
          unreadCount: 0, // TODO: Calculate unread count
          isTyping: [],
          createdAt: chatObj.created_at,
          updatedAt: chatObj.updated_at,
          rescueName: chat.rescue?.name || null,
          lastMessage,
        };
      });
      res.json({
        success: true,
        data: chatsWithRescueName,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error getting chats:', error);
      res.status(500).json({
        error: 'Failed to get chats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search conversations with text search capability
   */
  static async searchConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const rescueId = req.user!.rescueId;
      const {
        query,
        type,
        page = 1,
        limit = 20,
        sortBy = 'updated_at',
        sortOrder = 'DESC',
      } = req.query;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({
          error: 'Search query is required',
        });
      }

      const result = await ChatService.searchConversations({
        userId,
        rescueId: rescueId || undefined,
        query: query.trim(),
        type: type as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      });

      // Add rescueName and lastMessage to each chat in the response
      const chatsWithRescueName = result.chats.map(chat => {
        const chatObj = chat.toJSON();
        let lastMessage = null;
        if (Array.isArray(chatObj.Messages) && chatObj.Messages.length > 0) {
          const msg = chatObj.Messages[0];
          lastMessage = {
            id: msg.message_id,
            content:
              typeof msg.content === 'string' && msg.content.length > 120
                ? msg.content.slice(0, 120) + '...'
                : msg.content,
            senderId: msg.sender_id,
            createdAt: msg.created_at,
          };
        }
        return {
          ...chatObj,
          rescueName: chat.rescue?.name || null,
          lastMessage,
        };
      });
      res.json({
        success: true,
        data: chatsWithRescueName,
        pagination: result.pagination,
        message: `Found ${result.pagination.total} conversations matching "${query}"`,
      });
    } catch (error) {
      logger.error('Error searching conversations:', error);
      res.status(500).json({
        error: 'Failed to search conversations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send a message in a chat
   */
  static async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const { content, messageType = 'text', attachments } = req.body;
      const senderId = req.user!.userId;

      // Validation
      if (!content && (!attachments || attachments.length === 0)) {
        return res.status(400).json({
          error: 'Message content or attachments are required',
        });
      }

      if (!['text', 'image', 'file'].includes(messageType)) {
        return res.status(400).json({
          error: 'Invalid message type',
        });
      }

      const message = await ChatService.sendMessage({
        chatId,
        senderId,
        content,
        messageType,
        attachments,
      });

      // Get sender's full name using the helper function
      const messageWithSender = message as unknown as MessageWithSender;
      const senderName = getUserFullName(messageWithSender.Sender);

      res.status(201).json({
        success: true,
        data: {
          ...message.toJSON(),
          sender_name: senderName,
        },
        message: 'Message sent successfully',
      });
    } catch (error) {
      logger.error('Error sending message:', error);
      if (error instanceof Error && error.message === 'User is not a participant in this chat') {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
      res.status(500).json({
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get messages in a chat with pagination
   */
  static async getMessages(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const { chatId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const parsedPage = parseInt(page as string);
      const parsedLimit = parseInt(limit as string);

      const result = await ChatService.getMessages(chatId, {
        page: parsedPage,
        limit: parsedLimit,
      });

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      // Transform messages to match frontend Message interface
      const transformedMessages = result.messages.map(msg => {
        const msgObj: any = typeof (msg as any).toJSON === 'function' ? (msg as any).toJSON() : msg;

        // Get sender name using the helper function
        const senderName = getUserFullName(msgObj.Sender);

        return {
          id: msgObj.message_id,
          conversationId: msgObj.chat_id,
          senderId: msgObj.sender_id,
          senderName,
          content: msgObj.content || '',
          timestamp: msgObj.created_at,
          type: msgObj.content_format || 'text',
          status: 'sent',
          attachments: msgObj.attachments || [],
          isEdited: false,
          metadata: {},
        };
      });

      res.json({
        success: true,
        data: {
          messages: transformedMessages,
          pagination: {
            page: result.page,
            limit: parsedLimit,
            total: result.total,
            pages: result.totalPages,
          },
        },
      });
    } catch (error) {
      logger.error('Error getting messages:', {
        error: error instanceof Error ? error.message : String(error),
        chatId: req.params.chatId,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to get messages',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Mark messages as read
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const userId = req.user!.userId;

      await ChatService.markMessagesAsRead(chatId, userId);

      res.json({
        success: true,
        message: 'Messages marked as read',
      });
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      res.status(500).json({
        error: 'Failed to mark messages as read',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const userId = req.user!.userId;

      const count = await ChatService.getUnreadMessageCount(chatId, userId);

      res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      res.status(500).json({
        error: 'Failed to get unread count',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Add participant to chat
   */
  static async addParticipant(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId, role = 'member' } = req.body;
      const addedBy = req.user!.userId;

      // Validation
      if (!userId) {
        return res.status(400).json({
          error: 'User ID is required',
        });
      }

      if (!['member', 'admin'].includes(role)) {
        return res.status(400).json({
          error: 'Invalid role specified',
        });
      }

      await ChatService.addParticipant(chatId, userId, addedBy, role);

      res.json({
        success: true,
        message: 'Participant added successfully',
      });
    } catch (error) {
      logger.error('Error adding participant:', error);
      if (error instanceof Error && error.message === 'Only chat admins can add participants') {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
      res.status(500).json({
        error: 'Failed to add participant',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Remove participant from chat
   */
  static async removeParticipant(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId, userId } = req.params;
      const removedBy = req.user!.userId;

      await ChatService.removeParticipant(chatId, userId, removedBy);

      res.json({
        success: true,
        message: 'Participant removed successfully',
      });
    } catch (error) {
      logger.error('Error removing participant:', error);
      if (
        error instanceof Error &&
        error.message === 'Only chat admins can remove other participants'
      ) {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
      res.status(500).json({
        error: 'Failed to remove participant',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update chat information
   */
  static async updateChat(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const { chatId } = req.params;
      const updateData = req.body;
      const updatedBy = req.user!.userId;

      const chat = await ChatService.updateChat(chatId, updateData, updatedBy);

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: chat,
      });
    } catch (error) {
      logger.error('Error updating chat:', {
        error: error instanceof Error ? error.message : String(error),
        chatId: req.params.chatId,
        body: req.body,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to update chat',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a chat
   */
  static async deleteChat(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const deletedBy = req.user!.userId;

      await ChatService.deleteChat(chatId, deletedBy);

      res.json({
        success: true,
        message: 'Chat deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting chat:', error);
      if (error instanceof Error && error.message === 'Only chat admins can delete chats') {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
      res.status(500).json({
        error: 'Failed to delete chat',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a message
   */
  static async deleteMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId, messageId } = req.params;
      const { reason } = req.body;
      const deletedBy = req.user!.userId;

      await ChatService.deleteMessage(messageId, deletedBy, reason);

      res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting message:', error);
      if (error instanceof Error && error.message === 'Message not found') {
        return res.status(404).json({
          error: 'Message not found',
        });
      }
      res.status(500).json({
        error: 'Failed to delete message',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * React to a message
   */
  static async addReaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user!.userId;

      // Validation
      if (!emoji) {
        return res.status(400).json({
          error: 'Emoji is required',
        });
      }

      const message = await ChatService.addMessageReaction(messageId, userId, emoji);

      res.json({
        success: true,
        data: message,
        message: 'Reaction added successfully',
      });
    } catch (error) {
      logger.error('Error adding reaction:', error);
      if (error instanceof Error && error.message === 'Message not found') {
        return res.status(404).json({
          error: 'Message not found',
        });
      }
      if (error instanceof Error && error.message === 'User is not a participant in this chat') {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
      res.status(500).json({
        error: 'Failed to add reaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Remove reaction from a message
   */
  static async removeReaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user!.userId;

      // Validation
      if (!emoji) {
        return res.status(400).json({
          error: 'Emoji is required',
        });
      }

      const message = await ChatService.removeMessageReaction(messageId, userId, emoji);

      res.json({
        success: true,
        data: message,
        message: 'Reaction removed successfully',
      });
    } catch (error) {
      logger.error('Error removing reaction:', error);
      if (error instanceof Error && error.message === 'Message not found') {
        return res.status(404).json({
          error: 'Message not found',
        });
      }
      res.status(500).json({
        error: 'Failed to remove reaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get chat analytics
   */
  static async getChatAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const userType = req.user!.userType;
      const rescueId = req.user!.rescueId;
      const { startDate, endDate } = req.query;

      // Admin users get analytics for all chats, regular users get rescue-specific analytics
      const isAdmin = userType === UserType.ADMIN;
      const analytics = await ChatService.getChatAnalytics(
        startDate && endDate
          ? {
              start: new Date(startDate as string),
              end: new Date(endDate as string),
            }
          : undefined,
        isAdmin ? undefined : rescueId || undefined
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error getting chat analytics:', error);
      res.status(500).json({
        error: 'Failed to get chat analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Upload attachment for chat conversation
   */
  static async uploadAttachment(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;

      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
        });
      }

      // Verify user has access to this conversation by checking if they're a participant
      const chat = await ChatService.getChatById(conversationId, userId);
      if (!chat) {
        return res.status(404).json({
          error: 'Conversation not found',
        });
      }

      // Check if user is a participant in the chat
      const isParticipant = chat.Participants?.some(
        (p: ChatParticipant) => p.participant_id === userId
      );
      if (!isParticipant) {
        return res.status(403).json({
          error: 'Access denied to this conversation',
        });
      }

      // Process the uploaded file using FileUploadService
      const fileUploadResult = await FileUploadService.uploadFile(req.file, 'chat', {
        uploadedBy: userId,
        entityId: conversationId,
        entityType: 'chat',
        purpose: 'attachment',
      });

      if (!fileUploadResult.success || !fileUploadResult.upload) {
        throw new Error('File upload failed');
      }

      logger.info('Chat attachment uploaded successfully', {
        conversationId,
        userId,
        fileId: fileUploadResult.upload.upload_id,
        filename: fileUploadResult.upload.original_filename,
        size: fileUploadResult.upload.file_size,
        duration: Date.now() - startTime,
      });

      res.status(200).json({
        success: true,
        data: {
          id: fileUploadResult.upload.upload_id,
          filename: fileUploadResult.upload.original_filename,
          url: fileUploadResult.upload.url,
          mimeType: fileUploadResult.upload.mime_type,
          size: fileUploadResult.upload.file_size,
        },
      });
    } catch (error) {
      logger.error('Error uploading chat attachment:', error);
      res.status(500).json({
        error: 'Failed to upload attachment',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
