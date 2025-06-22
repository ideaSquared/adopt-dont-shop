import { DataTypes, Model, Op, Optional, Transaction } from 'sequelize';
import { Chat, ChatParticipant, Message } from '../models';
import sequelize from '../sequelize';
import { logger } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

export interface ReadStatusUpdate {
  user_id: string;
  message_ids: string[];
  chat_id: string;
  read_at: Date;
  unread_count: number;
}

export interface UnreadCountResult {
  chat_id: string;
  unread_count: number;
  last_message_id?: string;
  last_message_time?: Date;
}

export interface MessageReadInfo {
  message_id: string;
  read_by: string[];
  unread_by: string[];
  read_count: number;
  total_participants: number;
  read_percentage: number;
}

export class MessageReadStatusService {
  /**
   * Mark a single message as read by a user
   */
  static async markMessageAsRead(
    messageId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<ReadStatusUpdate> {
    const t = transaction || (await sequelize.transaction());

    try {
      // Get the message and verify it exists
      const message = await Message.findByPk(messageId, { transaction: t });
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user is a participant in the chat
      const isParticipant = await ChatParticipant.findOne({
        where: {
          chat_id: message.chat_id,
          participant_id: userId,
        },
        transaction: t,
      });

      if (!isParticipant) {
        throw new Error('User is not a participant in this chat');
      }

      // Update or create read status
      const [readStatus, created] = await MessageReadStatus.findOrCreate({
        where: {
          message_id: messageId,
          user_id: userId,
        },
        defaults: {
          message_id: messageId,
          user_id: userId,
          read_at: new Date(),
        },
        transaction: t,
      });

      if (!created && readStatus) {
        await readStatus.update({ read_at: new Date() }, { transaction: t });
      }

      // Get updated unread count for this chat
      const unreadCount = await this.getUnreadCount(message.chat_id, userId);

      // Log the read action
      await AuditLogService.log({
        action: 'MESSAGE_READ',
        entity: 'MESSAGE',
        entityId: messageId,
        userId,
        details: {
          chat_id: message.chat_id,
          read_at: new Date().toISOString(),
          unread_count: unreadCount,
        },
      });

      const result: ReadStatusUpdate = {
        user_id: userId,
        message_ids: [messageId],
        chat_id: message.chat_id,
        read_at: new Date(),
        unread_count: unreadCount,
      };

      if (!transaction) {
        await t.commit();
      }

      // Emit real-time update
      await this.emitReadStatusUpdate(result);

      logger.info('Message marked as read', {
        messageId,
        userId,
        chatId: message.chat_id,
        unreadCount,
      });

      return result;
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      logger.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Mark all messages in a chat as read for a user
   */
  static async markAllMessagesAsRead(chatId: string, userId: string): Promise<ReadStatusUpdate> {
    const t = await sequelize.transaction();

    try {
      // Verify user is a participant
      const isParticipant = await ChatParticipant.findOne({
        where: {
          chat_id: chatId,
          participant_id: userId,
        },
        transaction: t,
      });

      if (!isParticipant) {
        throw new Error('User is not a participant in this chat');
      }

      // Find all unread messages in the chat
      const unreadMessages = await Message.findAll({
        where: {
          chat_id: chatId,
          sender_id: { [Op.ne]: userId }, // Messages not sent by this user
        },
        include: [
          {
            model: MessageReadStatus,
            as: 'readStatus',
            where: { user_id: userId },
            required: false,
          },
        ],
        transaction: t,
      });

      const messagesToMark = unreadMessages.filter(
        message => !message.read_status?.some((status: any) => status.user_id === userId)
      );

      if (messagesToMark.length > 0) {
        const readAt = new Date();

        // Create read status records in bulk
        await MessageReadStatus.bulkCreate(
          messagesToMark.map(message => ({
            message_id: message.message_id,
            user_id: userId,
            read_at: readAt,
          })),
          {
            transaction: t,
            updateOnDuplicate: ['read_at', 'updated_at'],
          }
        );

        // Log bulk read action
        await AuditLogService.log({
          action: 'MESSAGES_BULK_READ',
          entity: 'CHAT',
          entityId: chatId,
          userId,
          details: {
            message_count: messagesToMark.length,
            read_at: readAt.toISOString(),
          },
        });

        const result: ReadStatusUpdate = {
          user_id: userId,
          message_ids: messagesToMark.map(msg => msg.message_id),
          chat_id: chatId,
          read_at: readAt,
          unread_count: 0,
        };

        await t.commit();

        // Emit real-time update
        await this.emitReadStatusUpdate(result);

        logger.info('All messages marked as read', {
          chatId,
          userId,
          messageCount: messagesToMark.length,
        });

        return result;
      }

      await t.commit();
      return {
        user_id: userId,
        message_ids: [],
        chat_id: chatId,
        read_at: new Date(),
        unread_count: 0,
      };
    } catch (error) {
      await t.rollback();
      logger.error('Error marking all messages as read:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a specific chat
   */
  static async getUnreadCount(chatId: string, userId: string): Promise<number> {
    try {
      const result = await Message.findAll({
        where: {
          chat_id: chatId,
          sender_id: { [Op.ne]: userId },
        },
        include: [
          {
            model: MessageReadStatus,
            as: 'read_status',
            where: { user_id: userId },
            required: false,
          },
        ],
      });

      return result.filter(message => !message.read_status?.length).length;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw new Error('Failed to get unread message count');
    }
  }

  /**
   * Get unread messages for all chats of a user
   */
  static async getUnreadMessagesForUser(userId: string): Promise<UnreadCountResult[]> {
    try {
      // Get all chats the user is part of
      const userChats = await Chat.findAll({
        include: [
          {
            model: ChatParticipant,
            as: 'participants',
            where: { participant_id: userId },
            required: true,
          },
        ],
        attributes: ['chat_id'],
      });

      const chatIds = userChats.map(chat => chat.chat_id);

      if (chatIds.length === 0) {
        return [];
      }

      // Get all messages that could be unread
      const messages = await Message.findAll({
        where: {
          chat_id: { [Op.in]: chatIds },
          sender_id: { [Op.ne]: userId },
        },
        include: [
          {
            model: MessageReadStatus,
            as: 'readStatus',
            where: { user_id: userId },
            required: false,
          },
        ],
        order: [
          ['chat_id', 'ASC'],
          ['created_at', 'DESC'],
        ],
      });

      // Count unread messages per chat and get last message info
      const chatUnreadCounts = new Map<string, UnreadCountResult>();

      messages.forEach(message => {
        const chatId = message.chat_id;
        const isUnread = !message.read_status?.length;

        if (!chatUnreadCounts.has(chatId)) {
          chatUnreadCounts.set(chatId, {
            chat_id: chatId,
            unread_count: 0,
            last_message_id: message.message_id,
            last_message_time: message.created_at,
          });
        }

        const chatInfo = chatUnreadCounts.get(chatId)!;
        if (isUnread) {
          chatInfo.unread_count += 1;
        }
      });

      return Array.from(chatUnreadCounts.values()).filter(result => result.unread_count > 0);
    } catch (error) {
      logger.error('Error getting unread messages:', error);
      throw new Error('Failed to get unread messages');
    }
  }

  /**
   * Check if a specific message is read by a user
   */
  static async isMessageRead(messageId: string, userId: string): Promise<boolean> {
    try {
      const readStatus = await MessageReadStatus.findOne({
        where: {
          message_id: messageId,
          user_id: userId,
        },
      });

      return !!readStatus;
    } catch (error) {
      logger.error('Error checking message read status:', error);
      return false;
    }
  }

  /**
   * Get detailed read information for a message
   */
  static async getMessageReadInfo(messageId: string): Promise<MessageReadInfo | null> {
    try {
      const message = await Message.findByPk(messageId);
      if (!message) {
        return null;
      }

      // Get all participants in the chat
      const participants = await ChatParticipant.findAll({
        where: { chat_id: message.chat_id },
        attributes: ['participant_id'],
      });

      // Get read statuses for this message
      const readStatuses = await MessageReadStatus.findAll({
        where: { message_id: messageId },
        attributes: ['user_id'],
      });

      const readBy = readStatuses.map(rs => rs.user_id);
      const allParticipantIds = participants.map(p => p.participant_id);
      const unreadBy = allParticipantIds.filter(
        id => id !== message.sender_id && !readBy.includes(id)
      );

      const totalParticipants = allParticipantIds.length - 1; // Exclude sender
      const readCount = readBy.length;
      const readPercentage = totalParticipants > 0 ? (readCount / totalParticipants) * 100 : 0;

      return {
        message_id: messageId,
        read_by: readBy,
        unread_by: unreadBy,
        read_count: readCount,
        total_participants: totalParticipants,
        read_percentage: Math.round(readPercentage),
      };
    } catch (error) {
      logger.error('Error getting message read info:', error);
      return null;
    }
  }

  /**
   * Get read statistics for a chat
   */
  static async getChatReadStatistics(
    chatId: string,
    userId: string
  ): Promise<{
    total_messages: number;
    unread_messages: number;
    read_percentage: number;
    last_read_message_id?: string;
    last_read_time?: Date;
  }> {
    try {
      const messages = await Message.findAll({
        where: {
          chat_id: chatId,
          sender_id: { [Op.ne]: userId },
        },
        include: [
          {
            model: MessageReadStatus,
            as: 'readStatus',
            where: { user_id: userId },
            required: false,
          },
        ],
        order: [['created_at', 'ASC']],
      });

      const totalMessages = messages.length;
      const unreadMessages = messages.filter(msg => !msg.read_status?.length).length;
      const readPercentage =
        totalMessages > 0 ? ((totalMessages - unreadMessages) / totalMessages) * 100 : 0;

      // Find last read message - simplified approach
      const readStatuses = await MessageReadStatus.findAll({
        where: {
          message_id: { [Op.in]: messages.map(m => m.message_id) },
          user_id: userId,
        },
        order: [['read_at', 'DESC']],
        limit: 1,
        attributes: ['message_id', 'read_at'],
      });

      const lastReadStatus = readStatuses[0];

      return {
        total_messages: totalMessages,
        unread_messages: unreadMessages,
        read_percentage: Math.round(readPercentage),
        last_read_message_id: lastReadStatus?.message_id,
        last_read_time: lastReadStatus?.read_at,
      };
    } catch (error) {
      logger.error('Error getting chat read statistics:', error);
      throw new Error('Failed to get chat read statistics');
    }
  }

  /**
   * Emit real-time read status updates
   */
  private static async emitReadStatusUpdate(update: ReadStatusUpdate): Promise<void> {
    try {
      // This would integrate with your Socket.IO service
      // For now, we'll just log it
      logger.info('Read status update ready to emit', update);

      // Example integration:
      // const socketService = SocketService.getInstance();
      // await socketService.emitReadStatusUpdate(update.chat_id, update);

      // Also send push notification if needed
      if (update.unread_count === 0) {
        // User has read all messages, might want to notify other participants
        // await NotificationService.sendChatReadNotification(update);
        logger.info('All messages read - notification would be sent here', update);
      }
    } catch (error) {
      logger.error('Error emitting read status update:', error);
    }
  }

  /**
   * Clean up old read status records (maintenance)
   */
  static async cleanupOldReadStatus(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const deletedCount = await MessageReadStatus.destroy({
        where: {
          read_at: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      logger.info('Cleaned up old read status records', {
        deletedCount,
        olderThanDays,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old read status records:', error);
      throw error;
    }
  }
}

interface MessageReadStatusAttributes {
  read_status_id: string;
  message_id: string;
  user_id: string;
  read_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface MessageReadStatusCreationAttributes
  extends Optional<MessageReadStatusAttributes, 'read_status_id' | 'created_at' | 'updated_at'> {}

export class MessageReadStatus
  extends Model<MessageReadStatusAttributes, MessageReadStatusCreationAttributes>
  implements MessageReadStatusAttributes
{
  public read_status_id!: string;
  public message_id!: string;
  public user_id!: string;
  public read_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MessageReadStatus.init(
  {
    read_status_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(`'read_' || left(md5(random()::text), 12)`),
    },
    message_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'messages',
        key: 'message_id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'message_read_status',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['message_id', 'user_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['read_at'],
      },
    ],
  }
);
