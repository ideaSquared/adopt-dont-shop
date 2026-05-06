import { Op, WhereOptions } from 'sequelize';
import { Chat, ChatParticipant, Message, User } from '../models';
import MessageReaction from '../models/MessageReaction';
import MessageRead from '../models/MessageRead';
import StaffMember from '../models/StaffMember';
import Rescue from '../models/Rescue';
import { validateSortField, validateSortOrder } from '../utils/sort-validation';

const CHAT_SORT_FIELDS = ['created_at', 'updated_at'] as const;
import { NotificationPriority, NotificationType } from '../models/Notification';
import sequelize from '../sequelize';
import {
  ContentModerationService,
  MessageModerationStatus,
  ScanSeverity,
} from './content-moderation.service';
import moderationService, { ReportCategory, ReportSeverity } from './moderation.service';
import {
  ChatListResponse,
  ChatMessage,
  ChatStatistics,
  ChatStatus,
  ChatType,
  ChatUpdateData,
  MessageContentFormat,
  MessageCreateData,
  MessageListResponse,
  MessageType,
  MessageUpdateData,
  ParticipantRole,
} from '../types/chat';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import { NotificationService } from './notification.service';

interface ChatCreateData {
  rescueId?: string;
  applicationId?: string;
  participantIds: string[];
  type?: 'direct' | 'group' | 'application'; // Make type optional since we infer it
  name?: string;
  petId?: string;
  initialMessage?: string;
}

interface SendMessageData {
  chatId: string;
  senderId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  attachments?: MessageAttachment[];
  replyToId?: string;
  threadId?: string; // Add support for message threading
  senderRescueId?: string;
}

interface MessageAttachment {
  attachment_id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

interface ChatSearchOptions {
  userId?: string;
  rescueId?: string;
  petId?: string;
  type?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  isAdmin?: boolean;
}

interface ConversationSearchOptions {
  userId?: string;
  rescueId?: string;
  query: string;
  type?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class ChatService {
  /**
   * Helper function to convert attachments from frontend format to backend format
   */
  private static convertAttachmentsToModelFormat(
    attachments: import('../types/chat').MessageAttachment[]
  ): import('../models/Message').MessageAttachment[] {
    return attachments.map(att => ({
      attachment_id: att.id,
      filename: att.filename,
      originalName: att.filename, // Use filename as originalName if not provided
      mimeType: att.mimeType,
      size: att.size,
      url: att.url,
    }));
  }

  /**
   * Helper function to convert Message model to ChatMessage interface
   */
  private static convertMessageToInterface(message: Message): ChatMessage {
    // Determine message type based on attachments
    const messageType = this.inferMessageType(message.attachments);

    if (!message.created_at) {
      logger.warn('Message missing created_at timestamp', {
        messageId: message.message_id,
        chatId: message.chat_id,
      });
    }

    if (!message.updated_at) {
      logger.warn('Message missing updated_at timestamp', {
        messageId: message.message_id,
        chatId: message.chat_id,
      });
    }

    return {
      message_id: message.message_id,
      chat_id: message.chat_id,
      sender_id: message.sender_id,
      content: message.content,
      content_format: message.content_format,
      type: messageType,
      attachments:
        message.attachments?.map(att => ({
          id: att.attachment_id,
          filename: att.filename,
          url: att.url,
          mimeType: att.mimeType,
          size: att.size,
        })) || [],
      created_at: message.created_at?.toISOString() ?? null,
      updated_at: message.updated_at?.toISOString() ?? null,
    };
  }

  /**
   * Helper function to convert Chat model to Chat interface
   */
  private static convertChatToInterface(
    chat: Chat & { Messages?: Message[]; Participants?: ChatParticipant[] }
  ): import('../types/chat').Chat {
    // Determine chat type based on chat properties
    let chatType: ChatType = ChatType.DIRECT;
    if (chat.application_id) {
      chatType = ChatType.APPLICATION;
    } else if (chat.Participants && chat.Participants.length > 2) {
      chatType = ChatType.GROUP;
    }

    return {
      chat_id: chat.chat_id,
      rescue_id: chat.rescue_id,
      pet_id: chat.pet_id,
      application_id: chat.application_id,
      type: chatType,
      status: chat.status as ChatStatus,
      created_at: chat.created_at.toISOString(),
      updated_at: chat.updated_at.toISOString(),
      participants:
        chat.Participants?.map(p => ({
          participant_id: p.participant_id,
          chat_id: p.chat_id,
          user_id: p.participant_id, // Use participant_id as user_id for interface compatibility
          role: p.role,
          joined_at: p.created_at?.toISOString() || new Date().toISOString(), // Use created_at as joined_at
          last_read_at: p.last_read_at?.toISOString(),
        })) || [],
      last_message: chat.Messages?.[0]
        ? this.convertMessageToInterface(chat.Messages[0])
        : undefined,
      unread_count: 0, // Should be calculated based on business logic
    };
  }

  /**
   * Shared authz check: confirms the given user is a participant of the
   * given chat. Throws "User is not a participant in this chat" on
   * failure; the controller layer maps that to a 403. Skipped when
   * isAdmin is true, which must be explicitly set by callers after
   * verifying the user's role — never inferred from a missing userId.
   *
   * Rescue staff (callers passing userRescueId) gain access to any chat
   * scoped to their rescue, even without a direct participant row. This
   * lets every staff member of a rescue see all conversations the
   * rescue is involved in (handover, coverage), not just chats they
   * were individually added to.
   */
  private static async requireChatParticipant(
    chatId: string,
    userId: string,
    isAdmin: boolean,
    userRescueId?: string
  ): Promise<void> {
    if (isAdmin) {
      return;
    }
    if (userRescueId) {
      const chat = await Chat.findByPk(chatId, { attributes: ['rescue_id'] });
      if (chat && chat.rescue_id === userRescueId) {
        return;
      }
    }
    const participant = await ChatParticipant.findOne({
      where: { chat_id: chatId, participant_id: userId },
    });
    if (!participant) {
      throw new Error('User is not a participant in this chat');
    }
  }

  /**
   * Resolves per-chat context that the controller layer needs to render
   * sender badges and rescue branding:
   *   - rescueName: pulled from the chat's owning Rescue row.
   *   - rescueStaffSenderIds: every userId that holds a verified
   *     staff_members row for the chat's rescue. We use the StaffMember
   *     table (canonical) rather than ChatParticipant.role so a sender
   *     who left the chat or was added by a different code path still
   *     gets correctly tagged as rescue staff.
   *
   * Returns an empty context if the chat or rescue is missing — the
   * mapper falls back to "adopter" with no branding, which is the
   * correct rendering for a chat that lost its rescue association.
   */
  static async getChatContext(chatId: string): Promise<{
    rescueStaffSenderIds: ReadonlySet<string>;
    rescueName: string | null;
  }> {
    const chat = await Chat.findByPk(chatId, { attributes: ['rescue_id'] });
    if (!chat || !chat.rescue_id) {
      return { rescueStaffSenderIds: new Set(), rescueName: null };
    }
    const [rescue, staff] = await Promise.all([
      Rescue.findByPk(chat.rescue_id, { attributes: ['name'] }),
      StaffMember.findAll({
        where: { rescueId: chat.rescue_id, isVerified: true },
        attributes: ['userId'],
      }),
    ]);
    return {
      rescueStaffSenderIds: new Set(staff.map(s => s.userId)),
      rescueName: rescue?.name ?? null,
    };
  }

  /**
   * Get chat by ID with messages.
   *
   * When isAdmin is false the caller must be a participant of the chat;
   * otherwise an error is thrown. Set isAdmin to true only after verifying
   * the caller holds the admin role via route-level or controller-level checks.
   */
  static async getChatById(
    chatId: string,
    userId: string,
    isAdmin: boolean,
    userRescueId?: string
  ): Promise<Chat | null> {
    const startTime = Date.now();

    try {
      const chat = await Chat.findByPk(chatId, {
        include: [
          {
            association: 'Participants',
            include: [
              {
                association: 'User',
                attributes: ['userId', 'firstName', 'lastName', 'email'],
              },
            ],
          },
          {
            association: 'Messages',
            include: [
              {
                association: 'Sender',
                attributes: ['userId', 'firstName', 'lastName', 'email'],
              },
            ],
            order: [['created_at', 'ASC']],
          },
          {
            association: 'rescue',
            attributes: ['rescue_id', 'name'],
          },
        ],
      });

      if (chat) {
        await this.requireChatParticipant(chatId, userId, isAdmin, userRescueId);
      }

      loggerHelpers.logDatabase('READ', {
        chatId,
        duration: Date.now() - startTime,
        found: !!chat,
      });

      return chat;
    } catch (error) {
      logger.error('Failed to get chat by ID:', {
        error: error instanceof Error ? error.message : String(error),
        chatId,
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Create a new chat
   */
  static async createChat(chatData: ChatCreateData, createdBy: string): Promise<Chat> {
    const startTime = Date.now();

    try {
      const chat = await Chat.create({
        rescue_id: chatData.rescueId || '',
        application_id: chatData.applicationId,
        pet_id: chatData.petId,
        status: ChatStatus.ACTIVE,
      });

      // Create chat participants. For rescue-role participants, scope them to
      // the chat's rescue so authorization code can later enforce that rescue
      // staff only act on chats for their own rescue.
      if (chatData.participantIds && chatData.participantIds.length > 0) {
        const participantPromises = chatData.participantIds
          .filter(participantId => participantId && participantId.trim())
          .map(participantId => {
            const role =
              participantId === createdBy ? ParticipantRole.USER : ParticipantRole.RESCUE;
            return ChatParticipant.create({
              chat_id: chat.chat_id,
              participant_id: participantId,
              role,
              rescue_id: role === ParticipantRole.RESCUE ? chatData.rescueId || null : null,
            });
          });
        await Promise.all(participantPromises);
      }

      // Send initial message if provided
      if (chatData.initialMessage) {
        await Message.create({
          chat_id: chat.chat_id,
          sender_id: createdBy,
          content: chatData.initialMessage,
          content_format: MessageContentFormat.PLAIN,
        });
      }

      await AuditLogService.log({
        action: 'CREATE',
        entity: 'Chat',
        entityId: chat.chat_id,
        details: {
          chatData: JSON.parse(JSON.stringify(chatData)),
          createdBy,
        },
        userId: createdBy,
      });

      loggerHelpers.logBusiness(
        'Chat Created',
        {
          chatId: chat.chat_id,
          createdBy,
          duration: Date.now() - startTime,
        },
        createdBy
      );

      return chat;
    } catch (error) {
      logger.error('Chat creation failed:', {
        error: error instanceof Error ? error.message : String(error),
        chatData: JSON.parse(JSON.stringify(chatData)),
        createdBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Search and list chats for a user
   */
  static async searchChats(options: ChatSearchOptions) {
    try {
      const {
        userId,
        rescueId,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        isAdmin = false,
      } = options;

      const offset = (page - 1) * limit;
      const safeSortBy = validateSortField(sortBy, CHAT_SORT_FIELDS, 'created_at');
      const safeSortOrder = validateSortOrder(sortOrder);

      // Build where conditions
      const whereConditions: WhereOptions = {
        status: { [Op.ne]: 'archived' },
      };

      if (rescueId) {
        whereConditions.rescue_id = rescueId;
      }

      // Build includes array
      const includes: Array<{
        model?: typeof Message | typeof ChatParticipant;
        as?: string;
        association?: string;
        attributes?: string[];
        limit?: number;
        order?: [string, string][];
        where?: Record<string, unknown>;
        required?: boolean;
        include?: Array<{
          model: typeof User;
          as: string;
          attributes: string[];
        }>;
      }> = [
        {
          model: Message,
          as: 'Messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'Sender',
              attributes: ['userId', 'firstName', 'lastName'],
            },
          ],
        },
        {
          association: 'rescue',
          attributes: ['name'],
        },
      ];

      // Admins see all chats. Rescue staff (rescueId set) see every chat
      // belonging to their rescue — already scoped by the rescue_id filter
      // on whereConditions, so no per-user participant filter is applied.
      // Adopters and other non-rescue users are filtered to chats they
      // participate in directly.
      const isRescueStaff = !isAdmin && !!rescueId;
      if (isAdmin || isRescueStaff) {
        includes.push({
          model: ChatParticipant,
          as: 'Participants',
          required: false,
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['userId', 'firstName', 'lastName', 'profileImageUrl'],
            },
          ],
        });
      } else {
        includes.push({
          model: ChatParticipant,
          as: 'Participants',
          where: { participant_id: userId },
          required: true,
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['userId', 'firstName', 'lastName', 'profileImageUrl'],
            },
          ],
        });
      }

      const { rows: chats, count: total } = await Chat.findAndCountAll({
        where: whereConditions,
        include: includes,
        limit,
        offset,
        order: [[safeSortBy, safeSortOrder]],
        distinct: true,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        chats,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error searching chats:', error);
      throw error;
    }
  }

  /**
   * Search conversations with text search capability
   */
  static async searchConversations(options: ConversationSearchOptions) {
    try {
      const {
        userId,
        rescueId,
        query,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = options;

      const offset = (page - 1) * limit;
      const safeSortBy = validateSortField(sortBy, CHAT_SORT_FIELDS, 'created_at');
      const safeSortOrder = validateSortOrder(sortOrder);

      // Build where conditions for chats
      const chatWhereConditions: WhereOptions = {
        status: { [Op.ne]: 'archived' },
      };

      if (rescueId) {
        chatWhereConditions.rescue_id = rescueId;
      }

      // Search in messages for the query
      const messageSearchConditions: WhereOptions = {
        [Op.or]: [{ content: { [Op.iLike]: `%${query}%` } }],
      };

      // If userId provided, filter by participation
      let participantFilter = {};
      if (userId) {
        participantFilter = {
          model: ChatParticipant,
          as: 'Participants',
          where: { participant_id: userId },
          required: true,
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['userId', 'firstName', 'lastName', 'profileImageUrl'],
            },
          ],
        };
      }

      const { rows: chats, count: total } = await Chat.findAndCountAll({
        where: chatWhereConditions,
        include: [
          participantFilter,
          {
            model: Message,
            as: 'Messages',
            where: messageSearchConditions,
            required: true,
            limit: 1,
            order: [['created_at', 'DESC']],
            include: [
              {
                model: User,
                as: 'Sender',
                attributes: ['userId', 'firstName', 'lastName'],
              },
            ],
          },
          {
            association: 'rescue',
            attributes: ['name'],
          },
        ],
        limit,
        offset,
        order: [[safeSortBy, safeSortOrder]],
        distinct: true,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        chats,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error searching conversations:', error);
      throw error;
    }
  }

  /**
   * Send a message in a chat
   */
  static async sendMessage(data: SendMessageData): Promise<Message> {
    const transaction = await sequelize.transaction();

    try {
      // Validate chat exists. Sender must either be a direct participant
      // or be staff of the chat's rescue (so any rescue staff member can
      // reply to chats their rescue is involved in).
      const chat = await Chat.findByPk(data.chatId, { transaction });

      if (!chat) {
        throw new Error('User is not a participant in this chat');
      }

      const isRescueStaffOfChat = !!data.senderRescueId && chat.rescue_id === data.senderRescueId;

      if (!isRescueStaffOfChat) {
        const participant = await ChatParticipant.findOne({
          where: { chat_id: data.chatId, participant_id: data.senderId },
          transaction,
        });
        if (!participant) {
          throw new Error('User is not a participant in this chat');
        }
      }

      // Check for rate limiting
      const recentMessages = await Message.count({
        where: {
          chat_id: data.chatId,
          sender_id: data.senderId,
          created_at: {
            [Op.gte]: new Date(Date.now() - 60000), // Last minute
          },
        },
        transaction,
      });

      if (recentMessages >= 10) {
        throw new Error('Rate limit exceeded. Please wait before sending more messages.');
      }

      // Validate message type if provided
      if (data.messageType) {
        const inferredType = this.inferMessageType(data.attachments);
        if (data.messageType !== inferredType) {
          logger.warn('Message type mismatch:', {
            providedType: data.messageType,
            inferredType,
            hasAttachments: !!(data.attachments && data.attachments.length > 0),
          });
        }
      }

      // Scan content for policy violations before saving
      const scanResult = ContentModerationService.scanContent(data.content);

      if (ContentModerationService.isMessageBlocked(scanResult)) {
        throw new Error('Message blocked: content violates platform policy');
      }

      const moderationFields = scanResult.isFlagged
        ? {
            is_flagged: true,
            flag_reason: scanResult.reason,
            flag_severity: scanResult.severity,
            moderation_status: MessageModerationStatus.PENDING_REVIEW,
            flagged_at: new Date(),
          }
        : {};

      // Create the message with proper field names
      const message = await Message.create(
        {
          chat_id: data.chatId,
          sender_id: data.senderId,
          content: data.content,
          content_format: MessageContentFormat.PLAIN,
          attachments: data.attachments || [],
          created_at: new Date(),
          ...moderationFields,
        },
        { transaction }
      );

      // Instead of reloading, let's find the message with includes to avoid the reload issue
      const messageWithSender = await Message.findByPk(message.message_id, {
        include: [
          {
            model: User,
            as: 'Sender',
            attributes: ['userId', 'firstName', 'lastName'],
          },
        ],
        transaction,
      });

      if (!messageWithSender) {
        throw new Error('Failed to retrieve created message');
      }

      // Update chat's last activity
      await Chat.update(
        { updated_at: new Date() },
        { where: { chat_id: data.chatId }, transaction }
      );

      await transaction.commit();

      // Auto-report HIGH/CRITICAL violations after commit
      if (ContentModerationService.shouldAutoReport(scanResult)) {
        try {
          const reportSeverity =
            scanResult.severity === ScanSeverity.CRITICAL
              ? ReportSeverity.CRITICAL
              : ReportSeverity.HIGH;

          await moderationService.submitReport('system', {
            reportedEntityType: 'message',
            reportedEntityId: messageWithSender.message_id,
            reportedUserId: data.senderId,
            category: ReportCategory.INAPPROPRIATE_CONTENT,
            severity: reportSeverity,
            title: `Auto-flagged: ${scanResult.reason}`,
            description: `Message automatically flagged for: ${scanResult.reason}. Severity: ${scanResult.severity}`,
          });
        } catch (reportError) {
          logger.warn('Failed to auto-create moderation report:', reportError);
        }
      }

      // Send real-time notifications to other participants
      try {
        const participants = await ChatParticipant.findAll({
          where: {
            chat_id: data.chatId,
            participant_id: { [Op.ne]: data.senderId },
          },
          include: [{ model: User, as: 'User' }],
        });

        // Send push notifications to offline users
        for (const participant of participants) {
          await NotificationService.createNotification({
            userId: participant.participant_id,
            type: NotificationType.MESSAGE_RECEIVED,
            title: 'New Message',
            message: `New message from ${messageWithSender.Sender?.firstName || 'Someone'}`,
            data: {
              chatId: data.chatId,
              messageId: messageWithSender.message_id,
              senderId: data.senderId,
            },
            priority: NotificationPriority.NORMAL,
          });
        }
      } catch (notificationError) {
        logger.warn('Failed to send notifications:', notificationError);
        // Don't fail the message send if notifications fail
      }

      // Determine the actual message type for logging
      const actualMessageType = this.inferMessageType(data.attachments);

      // Log the action
      await AuditLogService.log({
        userId: data.senderId,
        action: 'MESSAGE_SENT',
        entity: 'Message',
        entityId: messageWithSender.message_id,
        details: {
          chatId: data.chatId,
          messageType: actualMessageType,
        },
      });

      return messageWithSender;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Schedule a message to be sent later
   */
  static async scheduleMessage(data: {
    chatId: string;
    senderId: string;
    content: string;
    scheduledFor: Date;
    messageType?: 'text' | 'image' | 'file';
    attachments?: MessageAttachment[];
  }) {
    try {
      // Store scheduled message in database with a special status
      const scheduledMessage = await Message.create({
        chat_id: data.chatId,
        sender_id: data.senderId,
        content: data.content,
        content_format: MessageContentFormat.PLAIN,
        attachments: data.attachments || [],
        // Add scheduled_for field to your Message model
        // scheduled_for: data.scheduledFor,
        // is_scheduled: true,
        created_at: new Date(),
      });

      // You could implement a background job system to send these later
      // For now, we'll log the action
      logger.info('Message scheduled:', {
        messageId: scheduledMessage.message_id,
        chatId: data.chatId,
        scheduledFor: data.scheduledFor,
      });

      return scheduledMessage;
    } catch (error) {
      logger.error('Error scheduling message:', error);
      throw error;
    }
  }

  /**
   * Get scheduled messages for a chat
   */
  static async getScheduledMessages(chatId: string) {
    try {
      // This would require adding scheduled message fields to your model
      const scheduledMessages = await Message.findAll({
        where: {
          chat_id: chatId,
          // is_scheduled: true,
          // scheduled_for: { [Op.gt]: new Date() }
        },
        include: [
          {
            model: User,
            as: 'Sender',
            attributes: ['userId', 'firstName'],
          },
        ],
        order: [['created_at', 'ASC']],
      });

      return scheduledMessages.map(message => this.convertMessageToInterface(message));
    } catch (error) {
      logger.error('Error getting scheduled messages:', error);
      throw error;
    }
  }

  /**
   * Get messages in a chat with pagination
   */
  static async getMessages(
    chatId: string,
    options: {
      page?: number;
      limit?: number;
      before?: Date;
      after?: Date;
      userId?: string;
      isAdmin?: boolean;
      userRescueId?: string;
    } = {}
  ): Promise<MessageListResponse> {
    const startTime = Date.now();

    try {
      const {
        page = 1,
        limit = 50,
        before,
        after,
        userId,
        isAdmin = false,
        userRescueId,
      } = options;

      // Validate inputs
      if (page < 1) {
        throw new Error('Page must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      // Only participants (or rescue staff for that chat's rescue) can
      // read a chat's messages; admins bypass via explicit isAdmin flag.
      await this.requireChatParticipant(chatId, userId ?? '', isAdmin, userRescueId);

      const whereConditions: WhereOptions = { chat_id: chatId }; // Fix: use snake_case

      if (before) {
        whereConditions.created_at = { [Op.lt]: before }; // Fix: use snake_case
      }
      if (after) {
        whereConditions.created_at = { [Op.gt]: after }; // Fix: use snake_case
      }

      // Include Sender (User) with firstName and lastName for each message
      const { rows: messages, count: total } = await Message.findAndCountAll({
        where: whereConditions,
        order: [['created_at', 'ASC']],
        limit,
        offset: (page - 1) * limit,
        include: [
          {
            model: User,
            as: 'Sender',
            attributes: ['userId', 'firstName', 'lastName'],
          },
        ],
      });

      loggerHelpers.logPerformance('Message List', {
        duration: Date.now() - startTime,
        chatId,
        resultCount: messages.length,
        total,
        page,
      });

      // Transform messages to ChatMessage format.
      // IMPORTANT: keep the Sender association attached. The controller's
      // toFrontendMessage helper reads msg.Sender to produce the
      // frontend-facing senderName. Dropping it here was why every
      // message arrived on the client as "Unknown User".
      const transformedMessages = messages.map(msg => ({
        message_id: msg.message_id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        content: msg.content,
        content_format: msg.content_format,
        type: 'text' as MessageType, // Default to 'text' type
        attachments: (msg.attachments || []).map(att => ({
          id: att.attachment_id,
          filename: att.filename,
          url: att.url,
          mimeType: att.mimeType,
          size: att.size,
        })),
        created_at: msg.createdAt ? msg.createdAt.toISOString() : new Date(0).toISOString(),
        updated_at: msg.updatedAt ? msg.updatedAt.toISOString() : new Date(0).toISOString(),
        Sender: msg.Sender,
      })) as unknown as ChatMessage[];

      return {
        messages: transformedMessages,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get messages:', {
        error: error instanceof Error ? error.message : String(error),
        chatId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Mark messages as read for a user
   */
  static async markMessagesAsRead(chatId: string, userId: string, userRescueId?: string) {
    try {
      await this.requireChatParticipant(chatId, userId, false, userRescueId);

      // Read receipts moved to the message_reads table (plan 2.1) —
      // bulk-insert one row per (message, user). The unique
      // (message_id, user_id) constraint plus ignoreDuplicates makes
      // the operation idempotent: re-marking already-read messages is
      // a no-op without a per-row read+write round trip.
      const messages = await Message.findAll({
        where: {
          chat_id: chatId,
          sender_id: { [Op.ne]: userId },
        },
        attributes: ['message_id'],
      });

      if (messages.length === 0) {
        return true;
      }

      const readAt = new Date();
      await MessageRead.bulkCreate(
        messages.map(m => ({
          message_id: m.message_id,
          user_id: userId,
          read_at: readAt,
        })),
        { ignoreDuplicates: true }
      );

      return true;
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a user in a chat
   */
  static async getUnreadMessageCount(chatId: string, userId: string, userRescueId?: string) {
    try {
      await this.requireChatParticipant(chatId, userId, false, userRescueId);

      // "Unread for user" = chat messages not authored by user that
      // have no matching MessageRead row (plan 2.1). The eager-load
      // surfaces only the user's own read row via the where clause,
      // so missing Reads ⇔ unread.
      const messages = await Message.findAll({
        where: {
          chat_id: chatId,
          sender_id: { [Op.ne]: userId },
        },
        attributes: ['message_id'],
        include: [
          {
            model: MessageRead,
            as: 'Reads',
            where: { user_id: userId },
            required: false,
          },
        ],
      });

      return messages.filter(msg => !(msg as Message & { Reads?: MessageRead[] }).Reads?.length)
        .length;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Add participant to chat
   */
  static async addParticipant(chatId: string, userId: string, addedBy: string, role = 'member') {
    try {
      // Verify the person adding has rescue role
      const adder = await ChatParticipant.findOne({
        where: {
          chat_id: chatId,
          participant_id: addedBy,
          role: 'rescue',
        },
      });

      if (!adder) {
        throw new Error('Only rescue staff can add participants');
      }

      // Check if user is already a participant
      const existing = await ChatParticipant.findOne({
        where: { chat_id: chatId, participant_id: userId },
      });

      if (existing) {
        throw new Error('User is already a participant');
      }

      // Add new participant
      await ChatParticipant.create({
        chat_id: chatId,
        participant_id: userId,
        role: role === 'rescue' ? ParticipantRole.RESCUE : ParticipantRole.USER,
      });

      // Log the action
      await AuditLogService.log({
        userId: addedBy,
        action: 'CHAT_PARTICIPANT_ADDED',
        entity: 'Chat',
        entityId: chatId,
        details: { addedUserId: userId },
      });

      return true;
    } catch (error) {
      logger.error('Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Remove participant from chat
   */
  static async removeParticipant(chatId: string, userId: string, removedBy: string) {
    try {
      // Verify the person removing has rescue role or is removing themselves
      if (userId !== removedBy) {
        const remover = await ChatParticipant.findOne({
          where: {
            chat_id: chatId,
            participant_id: removedBy,
            role: 'rescue',
          },
        });

        if (!remover) {
          throw new Error('Only rescue staff can remove other participants');
        }
      }

      // Remove participant
      await ChatParticipant.destroy({
        where: { chat_id: chatId, participant_id: userId },
      });

      // Log the action
      await AuditLogService.log({
        userId: removedBy,
        action: 'CHAT_PARTICIPANT_REMOVED',
        entity: 'Chat',
        entityId: chatId,
        details: { removedUserId: userId },
      });

      return true;
    } catch (error) {
      logger.error('Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Update chat information
   */
  static async updateChat(
    chatId: string,
    updateData: ChatUpdateData,
    updatedBy: string
  ): Promise<Chat> {
    const startTime = Date.now();

    try {
      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const originalData = chat.toJSON();

      // Only update valid Chat model fields
      const validUpdateData: Partial<{ status: ChatStatus }> = {};
      if (updateData.status !== undefined) {
        validUpdateData.status = updateData.status as ChatStatus;
      }

      await chat.update(validUpdateData);

      await AuditLogService.log({
        action: 'UPDATE',
        entity: 'Chat',
        entityId: chatId,
        details: {
          originalData: JSON.parse(JSON.stringify(originalData)),
          updateData: JSON.parse(JSON.stringify(updateData)),
          updatedBy,
        },
        userId: updatedBy,
      });

      loggerHelpers.logBusiness(
        'Chat Updated',
        {
          chatId,
          updatedFields: Object.keys(updateData),
          updatedBy,
          duration: Date.now() - startTime,
        },
        updatedBy
      );

      return chat.reload();
    } catch (error) {
      logger.error('Chat update failed:', {
        error: error instanceof Error ? error.message : String(error),
        chatId,
        updatedBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Delete a chat (archive it)
   */
  static async deleteChat(chatId: string, deletedBy: string, reason?: string): Promise<void> {
    const startTime = Date.now();

    try {
      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      await chat.destroy();

      await AuditLogService.log({
        action: 'DELETE',
        entity: 'Chat',
        entityId: chatId,
        details: {
          reason: reason || null,
          deletedBy,
          chatData: JSON.parse(JSON.stringify(chat.toJSON())),
        },
        userId: deletedBy,
      });

      loggerHelpers.logBusiness(
        'Chat Deleted',
        {
          chatId,
          reason,
          deletedBy,
          duration: Date.now() - startTime,
        },
        deletedBy
      );
    } catch (error) {
      logger.error('Chat deletion failed:', {
        error: error instanceof Error ? error.message : String(error),
        chatId,
        deletedBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * React to a message. Reactions live in the message_reactions table
   * (plan 2.1); the unique index on (message_id, user_id, emoji) means
   * a duplicate reaction is a no-op via findOrCreate.
   */
  static async addMessageReaction(messageId: string, userId: string, emoji: string) {
    try {
      const message = await Message.findByPk(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      await this.requireChatParticipant(message.chat_id, userId, false);

      await MessageReaction.findOrCreate({
        where: { message_id: messageId, user_id: userId, emoji },
        defaults: { message_id: messageId, user_id: userId, emoji },
      });

      return message;
    } catch (error) {
      logger.error('Error adding message reaction:', error);
      throw error;
    }
  }

  /**
   * Remove reaction from a message
   */
  static async removeMessageReaction(messageId: string, userId: string, emoji: string) {
    try {
      const message = await Message.findByPk(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Previously this check was missing — anyone with a JWT and a
      // messageId could mutate their own reaction on any chat's message.
      // Now gated on participation.
      await this.requireChatParticipant(message.chat_id, userId, false);

      await MessageReaction.destroy({
        where: { message_id: messageId, user_id: userId, emoji },
      });

      return message;
    } catch (error) {
      logger.error('Error removing message reaction:', error);
      throw error;
    }
  }

  /**
   * Get analytics for chat activity
   */
  static async getChatAnalytics(dateRange?: { start: Date; end: Date }, rescueId?: string) {
    try {
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end || new Date();

      const dateFilter = {
        [Op.between]: [startDate, endDate],
      };

      // Build where conditions
      const whereConditions: WhereOptions = {
        created_at: dateFilter,
      };

      if (rescueId) {
        whereConditions.rescue_id = rescueId;
      }

      // Get total messages and chats
      const totalMessages = await Message.count({
        where: whereConditions,
      });

      const totalChats = await Chat.count({
        where: rescueId ? { rescue_id: rescueId } : {},
      });

      // Get active chats (chats with status 'active' or not archived)
      const activeChats = await Chat.count({
        where: rescueId
          ? { rescue_id: rescueId, status: { [Op.ne]: 'archived' } }
          : { status: { [Op.ne]: 'archived' } },
      });

      // Calculate average messages per chat safely
      const averageMessagesPerChat = totalChats > 0 ? Math.round(totalMessages / totalChats) : 0;

      return {
        totalMessages,
        totalChats,
        activeChats,
        averageMessagesPerChat,
        messageGrowth: await this.calculateMessageGrowth(rescueId),
      };
    } catch (error) {
      logger.error('Error getting chat analytics:', error);
      throw error;
    }
  }

  /**
   * Report a message or chat
   */
  static async reportContent(
    reportedBy: string,
    chatId: string,
    reason: string,
    messageId?: string,
    description?: string
  ) {
    try {
      // Create report logic here

      // Log the action
      await AuditLogService.log({
        userId: reportedBy,
        action: 'CHAT_REPORTED',
        entity: 'Chat',
        entityId: chatId,
        details: {
          reason: reason || 'No reason provided',
          description: description || 'No description provided',
          chatId,
          messageId: messageId || null,
        },
      });

      return { success: true };
    } catch (error) {
      logger.error('Error reporting content:', error);
      throw error;
    }
  }

  /**
   * Delete/hide a message - fix parameter order
   */
  static async deleteMessage(messageId: string, deletedBy: string, reason?: string): Promise<void> {
    const startTime = Date.now();

    try {
      const message = await Message.findByPk(messageId);

      if (!message) {
        throw new Error('Message not found');
      }

      // Soft delete by updating the appropriate field
      await message.update({
        // Use the field that actually exists in the model
        updated_at: new Date(),
        // Add a flag or modify content to indicate deletion
        content: '[Message deleted]',
      });

      // Log the action
      await AuditLogService.log({
        userId: deletedBy,
        action: 'MESSAGE_DELETED',
        entity: 'Message',
        entityId: messageId,
        details: { chatId: message.chat_id, reason: reason || 'No reason provided' },
      });

      loggerHelpers.logBusiness(
        'Message Deleted',
        {
          messageId,
          chatId: message.chat_id,
          reason,
          deletedBy,
          duration: Date.now() - startTime,
        },
        deletedBy
      );
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Block/unblock a participant in a chat
   */
  static async blockParticipant(
    chatId: string,
    userId: string,
    participantId: string
  ): Promise<void> {
    try {
      const participant = await ChatParticipant.findOne({
        where: { chat_id: chatId, participant_id: participantId }, // Use snake_case
      });

      if (!participant) {
        throw new Error('Participant not found in chat');
      }

      // Update the participant record appropriately
      await participant.update({
        updated_at: new Date(),
        // Add additional logic here for blocking if needed
      });

      // Log the action
      await AuditLogService.log({
        userId: userId,
        action: 'PARTICIPANT_BLOCKED',
        entity: 'ChatParticipant',
        entityId: participant.participant_id, // Use snake_case
        details: { chatId, participantId },
      });
    } catch (error) {
      logger.error('Error blocking participant:', error);
      throw error;
    }
  }

  /**
   * Moderate a message
   */
  static async moderateMessage(
    moderatorId: string,
    messageId: string,
    reason: string
  ): Promise<void> {
    try {
      const message = await Message.findByPk(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Verify user is a participant in the chat
      const participant = await ChatParticipant.findOne({
        where: {
          chat_id: message.chat_id,
          participant_id: moderatorId,
        },
      });

      if (!participant) {
        throw new Error('User is not a participant in this chat');
      }

      // Update the message record appropriately
      await message.update({
        updated_at: new Date(),
        content: '[Message moderated]',
      });

      // Log the action
      await AuditLogService.log({
        userId: moderatorId,
        action: 'MESSAGE_MODERATED',
        entity: 'Message',
        entityId: messageId,
        details: {
          chatId: message.chat_id,
          reason: reason || 'No reason provided',
        },
      });
    } catch (error) {
      logger.error('Error moderating message:', error);
      throw error;
    }
  }

  /**
   * Calculate message growth rate for a chat
   */
  private static async calculateMessageGrowth(chatId?: string): Promise<number> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const whereCondition = chatId ? { chat_id: chatId } : {};

      const [currentPeriodCount, previousPeriodCount] = await Promise.all([
        Message.count({
          where: {
            ...whereCondition,
            created_at: {
              [Op.between]: [thirtyDaysAgo, now],
            },
          },
        }),
        Message.count({
          where: {
            ...whereCondition,
            created_at: {
              [Op.between]: [sixtyDaysAgo, thirtyDaysAgo],
            },
          },
        }),
      ]);

      if (previousPeriodCount === 0) {
        return currentPeriodCount > 0 ? 100 : 0;
      }

      const growthRate = ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;
      return Math.round(growthRate * 100) / 100;
    } catch (error) {
      logger.error('Error calculating message growth:', error);
      return 0;
    }
  }

  static async getChats(
    filters: {
      userId?: string;
      type?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<ChatListResponse> {
    const startTime = Date.now();

    try {
      const { userId, type, status, search, page = 1, limit = 20 } = filters;

      const whereConditions: WhereOptions = {};

      if (userId) {
        whereConditions.userId = userId;
      }
      if (type) {
        whereConditions.type = type;
      }
      if (status) {
        whereConditions.status = status;
      }

      if (search) {
        (whereConditions as WhereOptions & { [Op.or]: WhereOptions[] })[Op.or] = [
          { chat_id: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows: chats, count: total } = await Chat.findAndCountAll({
        where: whereConditions,
        include: [
          {
            association: 'User',
            attributes: ['userId', 'firstName', 'lastName', 'email'],
          },
          {
            association: 'Messages',
            limit: 1,
            order: [['createdAt', 'DESC']],
          },
        ],
        order: [['updatedAt', 'DESC']],
        limit,
        offset: (page - 1) * limit,
      });

      loggerHelpers.logPerformance('Chat List', {
        duration: Date.now() - startTime,
        filters: Object.keys(filters),
        resultCount: chats.length,
        total,
        page,
      });

      return {
        chats: chats.map(chat =>
          this.convertChatToInterface(
            chat as Chat & { Messages?: Message[]; Participants?: ChatParticipant[] }
          )
        ),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get chats:', {
        error: error instanceof Error ? error.message : String(error),
        filters: Object.keys(filters),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async createMessage(messageData: MessageCreateData, createdBy: string): Promise<Message> {
    const startTime = Date.now();

    try {
      const message = await Message.create({
        chat_id: messageData.chatId,
        sender_id: createdBy,
        content: messageData.content,
        content_format: MessageContentFormat.PLAIN,
        attachments: messageData.attachments
          ? this.convertAttachmentsToModelFormat(messageData.attachments)
          : [],
      });

      await AuditLogService.log({
        action: 'CREATE',
        entity: 'Message',
        entityId: message.message_id,
        details: {
          chatId: messageData.chatId,
          messageType: 'text',
          createdBy,
        },
        userId: createdBy,
      });

      loggerHelpers.logBusiness(
        'Message Created',
        {
          messageId: message.message_id,
          chatId: messageData.chatId,
          type: 'text',
          createdBy,
          duration: Date.now() - startTime,
        },
        createdBy
      );

      return message;
    } catch (error) {
      logger.error('Message creation failed:', {
        error: error instanceof Error ? error.message : String(error),
        chatId: messageData.chatId,
        createdBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async updateMessage(
    messageId: string,
    updateData: MessageUpdateData,
    updatedBy: string
  ): Promise<Message> {
    const startTime = Date.now();

    try {
      const message = await Message.findByPk(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      const originalData = message.toJSON();
      await message.update(updateData);

      await AuditLogService.log({
        action: 'UPDATE',
        entity: 'Message',
        entityId: messageId,
        details: {
          originalData: JSON.parse(JSON.stringify(originalData)),
          updateData: JSON.parse(JSON.stringify(updateData)),
          updatedBy,
        },
        userId: updatedBy,
      });

      loggerHelpers.logBusiness(
        'Message Updated',
        {
          messageId,
          chatId: message.chat_id,
          updatedFields: Object.keys(updateData),
          updatedBy,
          duration: Date.now() - startTime,
        },
        updatedBy
      );

      return message.reload();
    } catch (error) {
      logger.error('Message update failed:', {
        error: error instanceof Error ? error.message : String(error),
        messageId,
        updatedBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async getChatStatistics(chatId?: string): Promise<ChatStatistics> {
    const startTime = Date.now();

    try {
      const totalChats = await Chat.count();
      const totalMessages = await Message.count();
      const activeChats = await Chat.count({ where: { status: 'active' } });
      const averageMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;
      const messageGrowthRate = await this.calculateMessageGrowthRate();
      const userEngagement = await this.calculateUserEngagement();

      loggerHelpers.logPerformance('Chat Statistics', {
        duration: Date.now() - startTime,
        totalChats,
        totalMessages,
        activeChats,
        averageMessagesPerChat,
        messageGrowthRate,
        userEngagement,
      });

      return {
        totalChats,
        totalMessages,
        activeChats,
        averageMessagesPerChat,
        messageGrowthRate,
        userEngagement,
      };
    } catch (error) {
      logger.error('Failed to get chat statistics:', {
        error: error instanceof Error ? error.message : String(error),
        chatId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  private static async calculateMessageGrowthRate(): Promise<number> {
    try {
      const now = new Date();
      const periodMs = 30 * 24 * 60 * 60 * 1000;
      const currentStart = new Date(now.getTime() - periodMs);
      const previousStart = new Date(now.getTime() - 2 * periodMs);

      const [current, previous] = await Promise.all([
        Message.count({
          where: { created_at: { [Op.between]: [currentStart, now] } },
        }),
        Message.count({
          where: { created_at: { [Op.between]: [previousStart, currentStart] } },
        }),
      ]);

      return ((current - previous) / Math.max(previous, 1)) * 100;
    } catch (error) {
      logger.error('Error calculating message growth rate:', error);
      return 0;
    }
  }

  private static async calculateUserEngagement(): Promise<number> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [activeMessagers, totalUsers] = await Promise.all([
        Message.count({
          distinct: true,
          col: 'sender_id',
          where: { created_at: { [Op.gte]: thirtyDaysAgo } },
        }),
        User.count(),
      ]);

      if (totalUsers === 0) {
        return 0;
      }
      return Math.min((activeMessagers / totalUsers) * 100, 100);
    } catch (error) {
      logger.error('Error calculating user engagement:', error);
      return 0;
    }
  }

  /**
   * Helper function to infer message type from attachments
   */
  private static inferMessageType(attachments?: MessageAttachment[]): MessageType {
    if (!attachments || attachments.length === 0) {
      return MessageType.TEXT;
    }

    // Check if any attachment is an image
    const hasImage = attachments.some(
      att =>
        att.mimeType?.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(att.filename || '')
    );

    return hasImage ? MessageType.IMAGE : MessageType.FILE;
  }

  /**
   * Enhanced message search with additional filters
   */
  static async searchMessagesWithFilters(options: {
    query: string;
    chatId?: string;
    senderId?: string;
    dateRange?: { start: Date; end: Date };
    page?: number;
    limit?: number;
  }) {
    try {
      const { query, chatId, senderId, dateRange, page = 1, limit = 20 } = options;
      const whereConditions: WhereOptions = {};

      if (chatId) {
        whereConditions.chat_id = chatId;
      }
      if (senderId) {
        whereConditions.sender_id = senderId;
      }
      if (dateRange) {
        whereConditions.created_at = {
          [Op.between]: [dateRange.start, dateRange.end],
        };
      }
      if (query) {
        whereConditions.content = { [Op.iLike]: `%${query}%` };
      }

      const { rows: messages, count: total } = await Message.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'Sender',
            attributes: ['userId', 'firstName', 'lastName'],
          },
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset: (page - 1) * limit,
      });

      return {
        messages: messages.map(message => this.convertMessageToInterface(message)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        searchQuery: query,
      };
    } catch (error) {
      logger.error('Error in message search with filters:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive message status for a chat
   */
  static async getMessageStatuses(chatId: string, userId: string) {
    try {
      const messages = await Message.findAll({
        where: { chat_id: chatId },
        include: [
          {
            model: User,
            as: 'Sender',
            attributes: ['userId', 'firstName'],
          },
          // Reactions eager-loaded from message_reactions (plan 2.1).
          {
            model: MessageReaction,
            as: 'Reactions',
            attributes: ['user_id', 'emoji', 'created_at'],
          },
          // Reads eager-loaded from message_reads (plan 2.1) — surfaces
          // both the read count (across all users) and whether the
          // current user has read each message.
          {
            model: MessageRead,
            as: 'Reads',
            attributes: ['user_id', 'read_at'],
          },
        ],
        order: [['created_at', 'ASC']],
      });

      return messages.map(message => {
        const reactions = (message as Message & { Reactions?: MessageReaction[] }).Reactions ?? [];
        const reads = (message as Message & { Reads?: MessageRead[] }).Reads ?? [];
        return {
          messageId: message.message_id,
          senderId: message.sender_id,
          content: message.content,
          isRead: reads.some(r => r.user_id === userId),
          readCount: reads.length,
          reactions: reactions.map(r => ({
            user_id: r.user_id,
            emoji: r.emoji,
            created_at: r.created_at,
          })),
          createdAt: message.created_at,
        };
      });
    } catch (error) {
      logger.error('Error getting message statuses:', error);
      throw error;
    }
  }
}
