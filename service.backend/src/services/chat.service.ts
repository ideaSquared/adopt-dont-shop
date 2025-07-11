import { Op, WhereOptions } from 'sequelize';
import { Chat, ChatParticipant, Message, User } from '../models';
import sequelize from '../sequelize';
import {
  ChatCreateData,
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

interface CreateChatData {
  rescueId?: string;
  applicationId?: string;
  participantIds: string[];
  type: 'direct' | 'group' | 'application';
  name?: string;
}

interface SendMessageData {
  chatId: string;
  senderId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  attachments?: MessageAttachment[];
  replyToId?: string;
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

interface UpdateChatData {
  name?: string;
  description?: string;
  status?: 'active' | 'locked' | 'archived';
  updatedBy: string;
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
    return {
      message_id: message.message_id,
      chat_id: message.chat_id,
      sender_id: message.sender_id,
      content: message.content,
      content_format: message.content_format,
      type: MessageType.TEXT, // Default to text type
      attachments:
        message.attachments?.map(att => ({
          id: att.attachment_id,
          filename: att.filename,
          url: att.url,
          mimeType: att.mimeType,
          size: att.size,
        })) || [],
      created_at: message.created_at.toISOString(),
      updated_at: message.updated_at.toISOString(),
    };
  }

  /**
   * Helper function to convert Chat model to Chat interface
   */
  private static convertChatToInterface(
    chat: Chat & { Messages?: Message[]; Participants?: any[] }
  ): import('../types/chat').Chat {
    return {
      chat_id: chat.chat_id,
      rescue_id: chat.rescue_id,
      pet_id: chat.pet_id,
      application_id: chat.application_id,
      type: ChatType.DIRECT, // Default type - should be determined by business logic
      status: chat.status as ChatStatus,
      created_at: chat.created_at.toISOString(),
      updated_at: chat.updated_at.toISOString(),
      participants:
        chat.Participants?.map(p => ({
          participant_id: p.participant_id,
          chat_id: p.chat_id,
          user_id: p.user_id,
          role: p.role,
          joined_at: p.joined_at?.toISOString() || new Date().toISOString(),
          last_read_at: p.last_read_at?.toISOString(),
        })) || [],
      last_message: chat.Messages?.[0]
        ? this.convertMessageToInterface(chat.Messages[0])
        : undefined,
      unread_count: 0, // Should be calculated based on business logic
    };
  }

  /**
   * Get chat by ID with messages
   */
  static async getChatById(chatId: string, userId?: string): Promise<Chat | null> {
    const startTime = Date.now();

    try {
      const chat = await Chat.findByPk(chatId, {
        include: [
          {
            association: 'User',
            attributes: ['userId', 'firstName', 'lastName', 'email'],
          },
          {
            association: 'Messages',
            include: [
              {
                association: 'User',
                attributes: ['userId', 'firstName', 'lastName', 'email'],
              },
            ],
            order: [['createdAt', 'ASC']],
          },
        ],
      });

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

      // Create chat participants
      if (chatData.participantIds && chatData.participantIds.length > 0) {
        const participantPromises = chatData.participantIds
          .filter(participantId => participantId && participantId.trim()) // Filter out null/undefined/empty values
          .map(participantId =>
            ChatParticipant.create({
              chat_id: chat.chat_id,
              participant_id: participantId,
              role: participantId === createdBy ? ParticipantRole.USER : ParticipantRole.RESCUE,
            })
          );
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
        petId,
        type,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = options;

      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions: any = {
        status: { [Op.ne]: 'archived' },
      };

      if (rescueId) {
        whereConditions.rescue_id = rescueId;
      }

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
        where: whereConditions,
        include: [
          participantFilter,
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
        ],
        limit,
        offset,
        order: [[sortBy, sortOrder]],
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
        type,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = options;

      const offset = (page - 1) * limit;

      // Build where conditions for chats
      const chatWhereConditions: any = {
        status: { [Op.ne]: 'archived' },
      };

      if (rescueId) {
        chatWhereConditions.rescue_id = rescueId;
      }

      // Search in messages for the query
      const messageSearchConditions: any = {
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
        order: [[sortBy, sortOrder]],
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
      // Validate chat exists and user is a participant
      const chat = await Chat.findByPk(data.chatId, {
        include: [
          {
            model: ChatParticipant,
            as: 'Participants',
            where: { participant_id: data.senderId }, // Use snake_case
          },
        ],
        transaction,
      });

      if (!chat) {
        throw new Error('Chat not found or user is not a participant');
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

      // Create the message with proper field names
      const message = await Message.create(
        {
          chat_id: data.chatId,
          sender_id: data.senderId,
          content: data.content,
          content_format: MessageContentFormat.PLAIN,
          attachments: data.attachments || [],
          created_at: new Date(),
        },
        { transaction }
      );

      // Instead of reloading, let's find the message with includes to avoid the reload issue
      const messageWithSender = await Message.findByPk(message.message_id, {
        include: [
          {
            model: User,
            as: 'Sender',
            attributes: ['userId', 'firstName'],
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

      // Log the action
      await AuditLogService.log({
        userId: data.senderId,
        action: 'MESSAGE_SENT',
        entity: 'Message',
        entityId: messageWithSender.message_id,
        details: {
          chatId: data.chatId,
          messageType: 'text',
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
   * Get messages in a chat with pagination
   */
  static async getMessages(
    chatId: string,
    options: {
      page?: number;
      limit?: number;
      before?: Date;
      after?: Date;
    } = {}
  ): Promise<MessageListResponse> {
    const startTime = Date.now();

    try {
      const { page = 1, limit = 50, before, after } = options;

      // Validate inputs
      if (page < 1) {
        throw new Error('Page must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      const whereConditions: WhereOptions = { chat_id: chatId }; // Fix: use snake_case

      if (before) {
        whereConditions.created_at = { [Op.lt]: before }; // Fix: use snake_case
      }
      if (after) {
        whereConditions.created_at = { [Op.gt]: after }; // Fix: use snake_case
      }

      // Include Sender (User) with firstName for each message
      const { rows: messages, count: total } = await Message.findAndCountAll({
        where: whereConditions,
        order: [['created_at', 'ASC']],
        limit,
        offset: (page - 1) * limit,
        include: [
          {
            model: User,
            as: 'Sender',
            attributes: ['userId', 'firstName'],
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

      return {
        messages: messages.map(message => this.convertMessageToInterface(message)),
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
  static async markMessagesAsRead(chatId: string, userId: string) {
    try {
      // Update read status using the model's instance method
      const messages = await Message.findAll({
        where: {
          chat_id: chatId,
          sender_id: { [Op.ne]: userId },
        },
      });

      for (const message of messages) {
        if (!message.isReadBy(userId)) {
          message.markAsRead(userId);
          await message.save();
        }
      }

      return true;
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a user in a chat
   */
  static async getUnreadMessageCount(chatId: string, userId: string) {
    try {
      const messages = await Message.findAll({
        where: {
          chat_id: chatId,
          sender_id: { [Op.ne]: userId },
        },
      });

      return messages.filter(message => !message.isReadBy(userId)).length;
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
      const validUpdateData: any = {};
      if (updateData.status !== undefined) {
        validUpdateData.status = updateData.status as 'active' | 'locked' | 'archived';
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
   * React to a message
   */
  static async addMessageReaction(messageId: string, userId: string, emoji: string) {
    try {
      const message = await Message.findByPk(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Verify user is a participant in the chat
      const participant = await ChatParticipant.findOne({
        where: {
          chat_id: message.chat_id,
          participant_id: userId,
        },
      });

      if (!participant) {
        throw new Error('User is not a participant in this chat');
      }

      // Add reaction using the model's instance method
      message.addReaction(userId, emoji);
      await message.save();

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

      // Remove reaction using the model's instance method
      message.removeReaction(userId, emoji);
      await message.save();

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
      const whereConditions: any = {
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

      // Calculate average messages per chat safely
      const avgMessagesPerChat = totalChats > 0 ? Math.round(totalMessages / totalChats) : 0;

      return {
        totalMessages,
        totalChats,
        avgMessagesPerChat,
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
        whereConditions[Op.or as any] = [{ chat_id: { [Op.iLike]: `%${search}%` } }];
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
        chats: chats.map(chat => this.convertChatToInterface(chat as any)),
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
    // Implementation of calculateMessageGrowthRate method
    // This method should return a number representing the message growth rate
    // For now, we'll return a placeholder value
    return 0;
  }

  private static async calculateUserEngagement(): Promise<number> {
    // Implementation of calculateUserEngagement method
    // This method should return a number representing the user engagement
    // For now, we'll return a placeholder value
    return 0;
  }
}
