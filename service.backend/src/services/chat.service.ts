import { Op, Transaction, WhereOptions, type Includeable } from 'sequelize';
import type { EntityActivity, EntityActivityFilters } from '@adopt-dont-shop/lib.types';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../middleware/error-handler';
import { Chat, ChatParticipant, Message, User } from '../models';
import { auditLogToActivity } from './audit-log-formatting';
import MessageReaction from '../models/MessageReaction';
import MessageRead from '../models/MessageRead';
import StaffMember from '../models/StaffMember';
import Rescue from '../models/Rescue';
import { validateSortField, validateSortOrder } from '../utils/sort-validation';
import { escapeLikePattern } from '../utils/escape-like';

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

/**
 * Placeholder content shown in place of messages whose author has been
 * soft-deleted (paranoid User row with deleted_at set). The Message and
 * Chat tables are not paranoid, so the rows remain for audit purposes —
 * but content must not survive the author's GDPR-driven deletion.
 *
 * The check is "Sender association resolved to null", which lines up
 * naturally with Sequelize's paranoid default: a belongsTo include to a
 * paranoid User model excludes soft-deleted rows from the join, leaving
 * Sender === null on the loaded Message instance.
 */
const DELETED_SENDER_CONTENT_PLACEHOLDER = '[Message from deleted user]';

const isSenderDeleted = (msg: { Sender?: unknown } | null | undefined): boolean => {
  if (!msg) {
    return false;
  }
  return msg.Sender === null || msg.Sender === undefined;
};

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
      throw new ForbiddenError('User is not a participant in this chat');
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
  /**
   * Resolve user IDs that should be added as participants when a chat is
   * opened against a given rescue. Centralised here so the controller
   * doesn't need to query the User model directly (ADS-489).
   *
   * Preserves the previous controller behaviour: the lookup is bounded
   * (default 50) and uses the User table (rescue affiliation lives in the
   * StaffMember join, but this is a cheap pre-filter for chat seeding —
   * downstream chat permission checks remain authoritative).
   */
  static async getRescueParticipantUserIds(
    rescueId: string,
    options: { limit?: number } = {}
  ): Promise<string[]> {
    const limit = options.limit ?? 50;
    const users = await User.findAll({
      where: { rescueId },
      attributes: ['userId'],
      limit,
    });
    return users.map(row => row.userId);
  }

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
   * Get chat by ID with a paginated slice of messages.
   *
   * When isAdmin is false the caller must be a participant of the chat;
   * otherwise an error is thrown. Set isAdmin to true only after verifying
   * the caller holds the admin role via route-level or controller-level checks.
   *
   * Messages are loaded via a separate query with limit/offset to prevent
   * unbounded memory load on chats with thousands of messages (DoS hardening).
   * The returned Chat instance has its Messages association populated with
   * the paginated slice, plus a messagesPagination field describing the
   * total count and applied window.
   */
  static async getChatById(
    chatId: string,
    userId: string,
    isAdmin: boolean,
    userRescueId?: string,
    messagesOptions: { limit?: number; offset?: number } = {}
  ): Promise<
    | (Chat & {
        messagesPagination?: { limit: number; offset: number; total: number };
      })
    | null
  > {
    const startTime = Date.now();
    const DEFAULT_LIMIT = 50;
    const MAX_LIMIT = 200;
    const requestedLimit = messagesOptions.limit ?? DEFAULT_LIMIT;
    const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(requestedLimit)));
    const offset = Math.max(0, Math.floor(messagesOptions.offset ?? 0));

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
            association: 'rescue',
            attributes: ['rescue_id', 'name'],
          },
        ],
      });

      if (!chat) {
        loggerHelpers.logDatabase('READ', {
          chatId,
          duration: Date.now() - startTime,
          found: false,
        });
        return null;
      }

      await this.requireChatParticipant(chatId, userId, isAdmin, userRescueId);

      const { rows: messages, count: total } = await Message.findAndCountAll({
        where: { chat_id: chatId },
        include: [
          {
            association: 'Sender',
            attributes: ['userId', 'firstName', 'lastName', 'email'],
          },
        ],
        // Per-chat monotonic sequence is the deterministic order. See
        // migration 08 and the sendMessage write path — created_at is
        // only millisecond-resolution and can tie under heavy load.
        order: [['sequence', 'ASC']],
        limit,
        offset,
      });

      // GDPR / privacy: messages whose Sender resolves to null are from
      // soft-deleted users (User is paranoid; the join filters them out).
      // Hide their content before returning the Chat to the client.
      for (const msg of messages) {
        if (isSenderDeleted(msg)) {
          msg.content = DELETED_SENDER_CONTENT_PLACEHOLDER;
          msg.attachments = [];
        }
      }

      // Attach paginated messages + pagination metadata to the Chat
      // instance. setDataValue keeps Sequelize's toJSON happy.
      const chatWithMessages = chat as Chat & {
        Messages?: Message[];
        messagesPagination?: { limit: number; offset: number; total: number };
      };
      chatWithMessages.setDataValue('Messages', messages);
      chatWithMessages.messagesPagination = { limit, offset, total };

      loggerHelpers.logDatabase('READ', {
        chatId,
        duration: Date.now() - startTime,
        found: true,
        messagesReturned: messages.length,
        messagesTotal: total,
      });

      return chatWithMessages;
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
   * Get the chronological activity log for a single chat.
   *
   * Backs the admin EntityInspector "Activity" tab. Verifies the chat
   * exists, then delegates to AuditLogService.getEntityActivityLog with
   * category 'Chat' — that's the casing chat audit writers use
   * (AuditLogService.log stores `category = data.entity`). Message-level
   * events (entity='Message') are intentionally excluded from this feed;
   * they live under their own category and would dwarf chat-level rows.
   */
  static async getChatActivityLog(
    chatId: string,
    filters: EntityActivityFilters = {}
  ): Promise<EntityActivity[]> {
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      throw new NotFoundError('Chat not found');
    }

    const rows = await AuditLogService.getEntityActivityLog('Chat', chatId, {
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      limit: filters.limit,
      offset: filters.offset,
    });

    return rows.map(auditLogToActivity);
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

      // Send initial message if provided. This is the chat's first
      // message so sequence starts at 0 — no need to lock + MAX since
      // the chat was created in this same call and can have no other
      // messages yet.
      if (chatData.initialMessage) {
        await Message.create({
          chat_id: chat.chat_id,
          sender_id: createdBy,
          content: chatData.initialMessage,
          content_format: MessageContentFormat.PLAIN,
          sequence: 0,
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
        limit: requestedLimit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        isAdmin = false,
      } = options;

      // Defense-in-depth: clamp the page size even though the route
      // validator already caps it, so a direct service caller can't
      // request an unbounded result set.
      const limit = Math.min(Math.max(requestedLimit, 1), 100);
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
      const includes: Includeable[] = [
        {
          model: Message,
          as: 'Messages',
          limit: 1,
          // Per-chat monotonic sequence (migration 08) — picks the
          // newest message deterministically when two share a created_at.
          order: [['sequence', 'DESC']],
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
        limit: requestedLimit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = options;

      // Defense-in-depth: clamp the page size server-side. The /search
      // route validator caps limit at 100, but a direct/legacy caller
      // could otherwise request an unbounded result set.
      const limit = Math.min(Math.max(requestedLimit, 1), 100);
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
        [Op.or]: [{ content: { [Op.iLike]: `%${escapeLikePattern(query)}%` } }],
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
            // Newest matching message per chat, picked deterministically
            // via per-chat sequence (migration 08).
            order: [['sequence', 'DESC']],
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
      //
      // `SELECT ... FOR UPDATE` on the chat row serializes concurrent
      // sends in the same chat so the per-chat MAX(sequence) read below
      // can't race against another in-flight send. Cross-chat sends are
      // unaffected — each chat row is its own lock anchor.
      const chat = await Chat.findByPk(data.chatId, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      if (!chat) {
        throw new ForbiddenError('User is not a participant in this chat');
      }

      const isRescueStaffOfChat = !!data.senderRescueId && chat.rescue_id === data.senderRescueId;

      if (!isRescueStaffOfChat) {
        const participant = await ChatParticipant.findOne({
          where: { chat_id: data.chatId, participant_id: data.senderId },
          transaction,
        });
        if (!participant) {
          throw new ForbiddenError('User is not a participant in this chat');
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
        throw new ForbiddenError('Rate limit exceeded. Please wait before sending more messages.');
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
        throw new ForbiddenError('Message blocked: content violates platform policy');
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

      // Compute the next per-chat sequence under the chat-row lock we
      // took above. Use findOne + ORDER BY instead of Model.max (which
      // may not be available in all Sequelize v7 test contexts).
      const latest = await Message.findOne({
        attributes: ['sequence'],
        where: { chat_id: data.chatId },
        order: [['sequence', 'DESC']],
        transaction,
      });
      const nextSequence = (latest?.sequence ?? -1) + 1;

      // Create the message with proper field names
      const message = await Message.create(
        {
          chat_id: data.chatId,
          sender_id: data.senderId,
          content: data.content,
          content_format: MessageContentFormat.PLAIN,
          attachments: data.attachments || [],
          sequence: nextSequence,
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

      // Determine the actual message type for the audit row. We resolve it
      // here (rather than after commit) so the audit write can be paired
      // with the message + chat-touch inside the same transaction.
      const auditMessageType = this.inferMessageType(data.attachments);

      // Log the action inside the transaction so the audit row commits
      // (or rolls back) atomically with the message write. Previously
      // this fired AFTER commit, so a thrown audit error left the message
      // committed but propagated as if the send failed, and the catch's
      // transaction.rollback() then no-op'd on an already-committed tx.
      await AuditLogService.log({
        userId: data.senderId,
        action: 'MESSAGE_SENT',
        entity: 'Message',
        entityId: messageWithSender.message_id,
        details: {
          chatId: data.chatId,
          messageType: auditMessageType,
        },
        transaction,
      });

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

      // Notify other participants in one bulkCreate (was N sequential
      // INSERT round-trips). Participant cap protects the DB + push
      // providers from a single send fanning out to thousands of users.
      const MAX_NOTIFY_PARTICIPANTS = 200;
      try {
        const participants = await ChatParticipant.findAll({
          where: {
            chat_id: data.chatId,
            participant_id: { [Op.ne]: data.senderId },
          },
          include: [{ model: User, as: 'User' }],
        });

        if (participants.length > MAX_NOTIFY_PARTICIPANTS) {
          throw new Error(
            `Chat has ${participants.length} participants which exceeds the ${MAX_NOTIFY_PARTICIPANTS} notification fan-out cap`
          );
        }

        if (participants.length > 0) {
          const senderName = messageWithSender.Sender?.firstName || 'Someone';
          await NotificationService.createNotificationsBulk(
            participants.map(p => ({
              userId: p.participant_id,
              type: NotificationType.MESSAGE_RECEIVED,
              title: 'New Message',
              message: `New message from ${senderName}`,
              data: {
                chatId: data.chatId,
                messageId: messageWithSender.message_id,
                senderId: data.senderId,
                // Deep-link for NotificationCenter / NotificationBell click
                // handlers (currently surfaced in app.client). Other apps
                // ignore action_url if their notification UI doesn't read it.
                action_url: `/chat/${data.chatId}`,
              },
              priority: NotificationPriority.NORMAL,
            }))
          );
        }
      } catch (notificationError) {
        logger.warn('Failed to send notifications:', notificationError);
        // Don't fail the message send if notifications fail
      }

      // Audit row was written inside the transaction above; nothing
      // to do post-commit beyond returning the resolved message.
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
    const transaction = await sequelize.transaction();
    try {
      // Lock the chat row before computing the next sequence so a
      // concurrent sendMessage on the same chat can't hand out the same
      // sequence value. Same pattern as sendMessage().
      await Chat.findByPk(data.chatId, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      const latestMsg = await Message.findOne({
        attributes: ['sequence'],
        where: { chat_id: data.chatId },
        order: [['sequence', 'DESC']],
        transaction,
      });
      const nextSequence = (latestMsg?.sequence ?? -1) + 1;

      // Store scheduled message in database with a special status
      const scheduledMessage = await Message.create(
        {
          chat_id: data.chatId,
          sender_id: data.senderId,
          content: data.content,
          content_format: MessageContentFormat.PLAIN,
          attachments: data.attachments || [],
          sequence: nextSequence,
          created_at: new Date(),
        },
        { transaction }
      );
      await transaction.commit();

      // You could implement a background job system to send these later
      // For now, we'll log the action
      logger.info('Message scheduled:', {
        messageId: scheduledMessage.message_id,
        chatId: data.chatId,
        scheduledFor: data.scheduledFor,
      });

      return scheduledMessage;
    } catch (error) {
      await transaction.rollback();
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
        throw new BadRequestError('Page must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new BadRequestError('Limit must be between 1 and 100');
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
        // Per-chat monotonic sequence — see migration 08 + sendMessage
        // write path. Replaces created_at ordering which could tie under
        // sub-millisecond send bursts.
        order: [['sequence', 'ASC']],
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
      //
      // Messages whose Sender resolves to null are from soft-deleted users
      // (User is paranoid: true; the join filters deleted_at IS NOT NULL).
      // GDPR / privacy: hide their content and attachments — the row
      // stays for audit but the body is no longer disclosed.
      const transformedMessages = messages.map(msg => {
        const senderDeleted = isSenderDeleted(msg);
        return {
          message_id: msg.message_id,
          chat_id: msg.chat_id,
          sender_id: msg.sender_id,
          content: senderDeleted ? DELETED_SENDER_CONTENT_PLACEHOLDER : msg.content,
          content_format: msg.content_format,
          type: 'text' as MessageType, // Default to 'text' type
          attachments: senderDeleted
            ? []
            : (msg.attachments || []).map(att => ({
                id: att.attachment_id,
                filename: att.filename,
                url: att.url,
                mimeType: att.mimeType,
                size: att.size,
              })),
          created_at: msg.createdAt ? msg.createdAt.toISOString() : new Date(0).toISOString(),
          updated_at: msg.updatedAt ? msg.updatedAt.toISOString() : new Date(0).toISOString(),
          Sender: msg.Sender,
        };
      }) as unknown as ChatMessage[];

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
      // have no matching MessageRead row (plan 2.1). Counted in SQL via a
      // LEFT JOIN keeping only rows where the user's read record is absent
      // (`$Reads.user_id$ IS NULL`), so we never load message rows into
      // Node memory just to count them.
      return await Message.count({
        where: {
          chat_id: chatId,
          sender_id: { [Op.ne]: userId },
          '$Reads.user_id$': null,
        },
        include: [
          {
            model: MessageRead,
            as: 'Reads',
            where: { user_id: userId },
            required: false,
            attributes: [],
          },
        ],
        distinct: true,
        col: 'message_id',
      });
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
        throw new ForbiddenError('Only rescue staff can add participants');
      }

      // Check if user is already a participant
      const existing = await ChatParticipant.findOne({
        where: { chat_id: chatId, participant_id: userId },
      });

      if (existing) {
        throw new ConflictError('User is already a participant');
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
          throw new ForbiddenError('Only rescue staff can remove other participants');
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
    updatedBy: string,
    isAdmin = false,
    userRescueId?: string
  ): Promise<Chat> {
    const startTime = Date.now();

    try {
      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      // Authorization: only chat participants, rescue staff (scoped to the
      // chat's rescue) or admins may mutate a chat. Without this any
      // authenticated user could update/archive arbitrary chats (IDOR).
      await this.requireChatParticipant(chatId, updatedBy, isAdmin, userRescueId);

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
  static async deleteChat(
    chatId: string,
    deletedBy: string,
    reason?: string,
    isAdmin = false,
    userRescueId?: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      // Authorization: only chat participants, rescue staff (scoped to the
      // chat's rescue) or admins may delete a chat. Without this any
      // authenticated user could archive arbitrary chats (IDOR).
      await this.requireChatParticipant(chatId, deletedBy, isAdmin, userRescueId);

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
        throw new NotFoundError('Message not found');
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
        throw new NotFoundError('Message not found');
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
        throw new NotFoundError('Message not found');
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
        throw new NotFoundError('Participant not found in chat');
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
        throw new NotFoundError('Message not found');
      }

      // Verify user is a participant in the chat
      const participant = await ChatParticipant.findOne({
        where: {
          chat_id: message.chat_id,
          participant_id: moderatorId,
        },
      });

      if (!participant) {
        throw new ForbiddenError('User is not a participant in this chat');
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
          { chat_id: { [Op.iLike]: `%${escapeLikePattern(search)}%` } },
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

    const transaction = await sequelize.transaction();
    try {
      // Lock chat row + compute next sequence; same pattern as
      // sendMessage so generic createMessage callers don't bypass the
      // per-chat monotonic ordering guarantee.
      await Chat.findByPk(messageData.chatId, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      const latestMsg = await Message.findOne({
        attributes: ['sequence'],
        where: { chat_id: messageData.chatId },
        order: [['sequence', 'DESC']],
        transaction,
      });
      const nextSequence = (latestMsg?.sequence ?? -1) + 1;

      const message = await Message.create(
        {
          chat_id: messageData.chatId,
          sender_id: createdBy,
          content: messageData.content,
          content_format: MessageContentFormat.PLAIN,
          attachments: messageData.attachments
            ? this.convertAttachmentsToModelFormat(messageData.attachments)
            : [],
          sequence: nextSequence,
        },
        { transaction }
      );
      await transaction.commit();

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
      await transaction.rollback();
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
        throw new NotFoundError('Message not found');
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
        whereConditions.content = { [Op.iLike]: `%${escapeLikePattern(query)}%` };
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
        // Per-chat monotonic sequence (migration 08).
        order: [['sequence', 'ASC']],
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
