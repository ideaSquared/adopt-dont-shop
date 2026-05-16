import { Response } from 'express';
import { DEFAULT_PAGE_SIZE, LARGE_PAGE_SIZE } from '../constants/pagination';
import { ChatParticipant } from '../models/ChatParticipant';
import User, { UserType } from '../models/User';
import { ChatService } from '../services/chat.service';
import { FileUploadService } from '../services/file-upload.service';
import { broadcastNewMessage, isUserOnline } from '../socket/socket-handlers';
import { ChatMessage } from '../types/chat';
import { logger, loggerHelpers } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';

// Type for participant with User association
type ParticipantWithUser = ChatParticipant & {
  User?: User | SerializedUser;
};

// Type for serialized user data (from toJSON)
type SerializedUser = {
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  profileImageUrl?: string;
  getFullName?: () => string;
};

// Interface for messages with populated Sender
interface MessageWithSender {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  content_format: string;
  type: string;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
  Sender?: User | SerializedUser;
  sender_name?: string;
  toJSON?: () => SerializedMessage;
}

// Type for serialized message object
type SerializedMessage = {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  content_format: string;
  type: string;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
  Sender?: User | SerializedUser;
};

/**
 * Reads a timestamp off a Sequelize instance or its toJSON() output. The
 * models declare snake_case attributes (created_at) for parity with the
 * DB schema, but with `underscored: true` Sequelize still serializes
 * timestamps under the camelCase keys (createdAt / updatedAt). Reading
 * `obj.created_at` therefore returns undefined and the frontend falls
 * back to `new Date(undefined)` → 1970-01-01 01:00. This helper checks
 * both shapes so a single field rename in the model can't silently
 * regress every chat timestamp.
 */
const readTimestamp = (obj: unknown, ...keys: string[]): string | undefined => {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
};

const readCreatedAt = (obj: unknown): string | undefined =>
  readTimestamp(obj, 'createdAt', 'created_at');

const readUpdatedAt = (obj: unknown): string | undefined =>
  readTimestamp(obj, 'updatedAt', 'updated_at');

/**
 * Safely extract full name from a User object or serialized user data
 * Handles both Sequelize model instances and plain objects (from toJSON)
 */
const getUserFullName = (user: User | SerializedUser | undefined | null): string => {
  if (!user) {
    return 'Unknown User';
  }

  // If it's a User model instance with getFullName method, use it
  if (typeof (user as User).getFullName === 'function') {
    return (user as User).getFullName() || 'Unknown User';
  }

  // Otherwise extract from properties (handles both camelCase and snake_case)
  const userData = user as SerializedUser;
  const firstName = userData.firstName || userData.first_name || '';
  const lastName = userData.lastName || userData.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || 'Unknown User';
};

/**
 * Per-chat metadata that lets the frontend render rescue branding and
 * staff badges without doing a second round-trip:
 *   - `rescueStaffSenderIds`: senders who replied on behalf of the rescue
 *     (membership confirmed via staff_members at the controller layer).
 *   - `rescueName`: display name for the chat's rescue. Used by adopter
 *     UIs to replace the staff member's real name with the rescue name.
 */
export type FrontendMessageContext = {
  rescueStaffSenderIds?: ReadonlySet<string>;
  rescueName?: string | null;
};

export type FrontendMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'rescue_staff' | 'adopter';
  senderRescueName: string | null;
  content: string;
  timestamp: string;
  type: string;
  status: string;
  attachments: unknown[];
  isEdited: boolean;
  metadata: Record<string, never>;
};

/**
 * Canonical "frontend message" shape that matches lib.chat's Message type.
 * All three send-paths (POST /messages, GET /messages, new_message socket
 * broadcast) now funnel through this so the frontend always sees the same
 * camelCase keys with a populated senderName — no more
 * getSenderName-on-missing-association showing up as "Unknown User" because
 * one path serialized the Sequelize instance raw.
 *
 * `context.rescueStaffSenderIds` lets each call site supply the senders
 * who are acting as rescue staff. When omitted, `senderRole` falls back
 * to 'adopter' — preserving prior behaviour for paths that don't yet
 * resolve rescue affiliation (e.g. socket fan-out with only the new
 * message in scope).
 */
export const toFrontendMessage = (
  raw: MessageWithSender | SerializedMessage,
  context: FrontendMessageContext = {}
): FrontendMessage => {
  const msg: SerializedMessage =
    typeof (raw as MessageWithSender).toJSON === 'function'
      ? (raw as MessageWithSender).toJSON!()
      : (raw as SerializedMessage);

  // Sequelize's default toJSON on an instance with eager-loaded associations
  // usually serializes Sender too, but some model setups (or test fixtures)
  // include Sender only on the raw instance. Prefer whichever has it.
  const sender = msg.Sender ?? (raw as MessageWithSender).Sender;

  const isRescueStaff = !!context.rescueStaffSenderIds?.has(msg.sender_id);

  return {
    id: msg.message_id,
    conversationId: msg.chat_id,
    senderId: msg.sender_id,
    senderName: getUserFullName(sender),
    senderRole: isRescueStaff ? 'rescue_staff' : 'adopter',
    senderRescueName: isRescueStaff ? (context.rescueName ?? null) : null,
    content: msg.content || '',
    timestamp: readCreatedAt(msg) ?? '',
    type: msg.content_format || 'text',
    status: 'sent',
    attachments: msg.attachments || [],
    isEdited: false,
    metadata: {},
  };
};

export class ChatController {
  /**
   * Create a new chat conversation
   */
  static async createChat(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { rescueId, petId, applicationId, type, initialMessage } = req.body;
    const createdBy = req.user!.userId;

    // Create participant IDs array: start with the user who created the chat
    const participantIds = [createdBy];

    // If there's a rescue involved, add the rescue staff users as participants
    if (rescueId && rescueId !== createdBy) {
      try {
        // Find users who belong to this rescue (limit to 50 to avoid unbounded queries)
        const rescueUserIds = await ChatService.getRescueParticipantUserIds(rescueId);

        // Add rescue staff user IDs to participants (use Set for O(1) dedup)
        const participantSet = new Set(participantIds);
        rescueUserIds.forEach(uid => participantSet.add(uid));
        participantIds.length = 0;
        participantIds.push(...Array.from(participantSet));
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
      createdAt: readCreatedAt(chat),
      updatedAt: readUpdatedAt(chat),
      // Keep backward compatibility fields
      chat_id: chat.chat_id,
      rescue_id: chat.rescue_id,
      pet_id: chat.pet_id,
      application_id: chat.application_id,
      created_at: readCreatedAt(chat),
      updated_at: readUpdatedAt(chat),
    };

    res.json({
      success: true,
      data: response,
    });
  }

  /**
   * Get chat by ID
   */
  static async getChatById(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const userId = req.user!.userId;
      const isAdmin = req.user!.userType === UserType.ADMIN;
      const userRescueId = req.user!.rescueId || undefined;

      const chat = await ChatService.getChatById(chatId, userId, isAdmin, userRescueId);

      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
        });
      }

      const chatObj = chat.toJSON();

      // Log participants data for debugging
      logger.info('Chat participants data', {
        chatId: chatObj.chat_id,
        hasParticipants: !!chatObj.Participants,
        participantsCount: chatObj.Participants?.length || 0,
        participantIds:
          (chatObj.Participants as ParticipantWithUser[] | undefined)?.map(p => p.participant_id) ||
          [],
      });

      // Transform participants to match frontend Participant interface
      const participants =
        (chatObj.Participants as ParticipantWithUser[] | undefined)?.map(p => {
          if (!p.User) {
            logger.warn('Participant missing User association', {
              chatId: chatObj.chat_id,
              participantId: p.participant_id,
            });
          }

          return {
            id: p.participant_id,
            name: getUserFullName(p.User),
            type: p.role === 'admin' ? 'admin' : 'user',
            avatarUrl:
              p.User && typeof p.User === 'object' && 'profileImageUrl' in p.User
                ? p.User.profileImageUrl
                : undefined,
            isOnline: isUserOnline(p.participant_id),
          };
        }) || [];

      logger.info('Transformed participants', {
        chatId: chatObj.chat_id,
        participantsCount: participants.length,
        participants: participants.map(p => ({ id: p.id, name: p.name })),
      });

      const unreadCount = userId
        ? await ChatService.getUnreadMessageCount(chatObj.chat_id, userId, userRescueId)
        : 0;

      // Transform to match frontend Conversation interface
      const transformedChat = {
        id: chatObj.chat_id,
        chat_id: chatObj.chat_id,
        participants,
        unreadCount,
        updatedAt: readUpdatedAt(chatObj),
        createdAt: readCreatedAt(chatObj),
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
    const userId = req.user!.userId;
    const userType = req.user!.userType;
    const rescueId = req.user!.rescueId;
    const {
      petId,
      type,
      page = 1,
      limit = DEFAULT_PAGE_SIZE,
      sortBy = 'updated_at',
      sortOrder = 'DESC',
    } = req.query;

    // Admin users can see all chats, regular users only see chats they're participants in
    const isAdmin = userType === UserType.ADMIN;
    const searchOptions = {
      userId,
      rescueId: rescueId || undefined,
      petId: petId as string,
      type: type as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC',
      isAdmin,
    };

    const result = await ChatService.searchChats(searchOptions);

    logger.info('Chat search results', {
      isAdmin,
      userId: isAdmin ? 'undefined (admin)' : userId,
      rescueId: isAdmin ? 'undefined (admin)' : rescueId,
      totalChats: result.chats.length,
      totalCount: result.pagination.total,
    });

    // Add rescueName, lastMessage, and real unread count to each chat.
    // Unread is resolved per-chat in parallel; admin listings (no userId)
    // skip the count since admins don't have an unread-mailbox view.
    const chatsWithRescueName = await Promise.all(
      result.chats.map(async chat => {
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
            createdAt: readCreatedAt(msg),
          };
        }

        // Transform participants to match frontend Participant interface
        const participants =
          (chatObj.Participants as ParticipantWithUser[] | undefined)?.map(p => ({
            id: p.participant_id,
            name: getUserFullName(p.User),
            type: p.role === 'admin' ? 'admin' : 'user',
            avatarUrl:
              p.User && typeof p.User === 'object' && 'profileImageUrl' in p.User
                ? p.User.profileImageUrl
                : undefined,
            isOnline: isUserOnline(p.participant_id),
          })) || [];

        const unreadCount = isAdmin
          ? 0
          : await ChatService.getUnreadMessageCount(chatObj.chat_id, userId, rescueId || undefined);

        return {
          id: chatObj.chat_id,
          userId: undefined, // No user_id field in chat model
          rescueId: chatObj.rescue_id,
          petId: chatObj.pet_id,
          applicationId: chatObj.application_id,
          type: 'general', // Default type since not in model
          status: chatObj.status,
          participants,
          unreadCount,
          isTyping: [],
          createdAt: readCreatedAt(chatObj),
          updatedAt: readUpdatedAt(chatObj),
          rescueName: chat.rescue?.name || null,
          lastMessage,
        };
      })
    );
    res.json({
      success: true,
      data: chatsWithRescueName,
      pagination: result.pagination,
    });
  }

  /**
   * Search conversations with text search capability
   */
  static async searchConversations(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    const rescueId = req.user!.rescueId;
    const {
      query,
      type,
      page = 1,
      limit = DEFAULT_PAGE_SIZE,
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
          createdAt: readCreatedAt(msg),
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

      const senderRescueId = req.user!.rescueId || undefined;

      const message = await ChatService.sendMessage({
        chatId,
        senderId,
        content,
        messageType,
        attachments,
        senderRescueId,
      });

      const chatContext = await ChatService.getChatContext(chatId);
      const frontendMessage = toFrontendMessage(
        message as unknown as MessageWithSender,
        chatContext
      );

      // Real-time fan-out. Without this, recipients only see the message
      // on next page load — the existing socket "new_message" event was
      // only emitted by the deprecated socket send_message handler, never
      // by the REST path that the frontend actually uses.
      //
      // We emit to each participant's personal user:{id} room rather than
      // a chat:{chatId} room, so the frontend doesn't need to track
      // chat-room membership — every authenticated socket auto-joins its
      // own user room on connect. The sender is included and the client
      // dedupes by message id (the sender already appended the message
      // optimistically from the REST response).
      try {
        const participants = await ChatParticipant.findAll({
          where: { chat_id: chatId },
          attributes: ['participant_id'],
        });
        const recipientIds = participants.map(p => p.participant_id);
        broadcastNewMessage(chatId, frontendMessage, recipientIds);
      } catch (err) {
        // Broadcasting is best-effort — log and move on rather than
        // failing the send when the socket fan-out misfires.
        logger.warn('Failed to broadcast new_message over socket:', err);
      }

      res.status(201).json({
        success: true,
        data: frontendMessage,
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
      const { page = 1, limit = LARGE_PAGE_SIZE } = req.query;

      const parsedPage = parseInt(page as string);
      const parsedLimit = parseInt(limit as string);

      const userId = req.user!.userId;
      const userType = req.user!.userType;
      const isAdmin = userType === UserType.ADMIN;
      const userRescueId = req.user!.rescueId || undefined;

      // Admins bypass the participant check; everyone else must be a
      // participant of this chat (or staff of the chat's rescue) to read
      // its messages.
      const [result, chatContext] = await Promise.all([
        ChatService.getMessages(chatId, {
          page: parsedPage,
          limit: parsedLimit,
          userId,
          isAdmin,
          userRescueId,
        }),
        ChatService.getChatContext(chatId),
      ]);

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      // Canonical frontend shape — same helper the POST /messages path uses.
      const transformedMessages = result.messages.map(msg =>
        toFrontendMessage(msg as unknown as MessageWithSender, chatContext)
      );

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
      if (error instanceof Error && error.message === 'User is not a participant in this chat') {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
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
    const { chatId } = req.params;
    const userId = req.user!.userId;
    const userRescueId = req.user!.rescueId || undefined;

    await ChatService.markMessagesAsRead(chatId, userId, userRescueId);

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const userId = req.user!.userId;
      const userRescueId = req.user!.rescueId || undefined;

      const count = await ChatService.getUnreadMessageCount(chatId, userId, userRescueId);

      res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      if (error instanceof Error && error.message === 'User is not a participant in this chat') {
        return res.status(403).json({
          error: 'Access denied',
          message: error.message,
        });
      }
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

    const { chatId } = req.params;
    const updateData = req.body;
    const updatedBy = req.user!.userId;

    const chat = await ChatService.updateChat(chatId, updateData, updatedBy);

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: chat,
    });
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
  }

  /**
   * Upload attachment for chat conversation
   */
  static async uploadAttachment(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { conversationId } = req.params;
    const userId = req.user!.userId;
    const userRescueId = req.user!.rescueId || undefined;

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    // Verify user has access to this conversation. getChatById enforces
    // participant-or-rescue-staff access; if the user is staff of the
    // chat's rescue we don't also require a direct participant row.
    const chat = await ChatService.getChatById(conversationId, userId, false, userRescueId);
    if (!chat) {
      return res.status(404).json({
        error: 'Conversation not found',
      });
    }

    const isParticipant = chat.Participants?.some(
      (p: ChatParticipant) => p.participant_id === userId
    );
    const isRescueStaffOfChat = !!userRescueId && chat.rescue_id === userRescueId;
    if (!isParticipant && !isRescueStaffOfChat) {
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
  }
}
