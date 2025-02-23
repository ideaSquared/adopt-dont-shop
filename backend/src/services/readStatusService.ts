import { Op, Transaction } from 'sequelize'
import { Chat, ChatParticipant, Message, MessageReadStatus } from '../Models'
import sequelize from '../sequelize'
import SocketService from './socketService'

export class ReadStatusService {
  /**
   * Mark a single message as read
   */
  public static async markMessageAsRead(
    messageId: string,
    userId: string,
    transaction?: Transaction,
  ): Promise<void> {
    const t = transaction || (await sequelize.transaction())
    try {
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
      })

      if (!created && readStatus) {
        await readStatus.update({ read_at: new Date() }, { transaction: t })
      }

      if (!transaction) {
        await t.commit()
      }
    } catch (error) {
      if (!transaction) {
        await t.rollback()
      }
      throw error
    }
  }

  /**
   * Mark all messages in a chat as read for a user
   */
  public static async markAllMessagesAsRead(
    chatId: string,
    userId: string,
  ): Promise<void> {
    const t = await sequelize.transaction()
    try {
      // Find all unread messages in the chat
      const unreadMessages = await Message.findAll({
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
        transaction: t,
      })

      const messagesToMark = unreadMessages.filter(
        (message) =>
          !message.readStatus?.some((status) => status.user_id === userId),
      )

      if (messagesToMark.length > 0) {
        const readAt = new Date()

        // Create read status records in bulk
        await MessageReadStatus.bulkCreate(
          messagesToMark.map((message) => ({
            message_id: message.message_id,
            user_id: userId,
            read_at: readAt,
          })),
          {
            transaction: t,
            updateOnDuplicate: ['read_at', 'updated_at'],
          },
        )

        // Emit socket update
        await SocketService.getInstance().emitReadStatusUpdate(chatId, {
          user_id: userId,
          message_ids: messagesToMark.map((msg) => msg.message_id),
          read_at: readAt,
        })
      }

      await t.commit()
      return
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  /**
   * Get unread message count for a specific chat
   */
  public static async getUnreadCount(
    chatId: string,
    userId: string,
  ): Promise<number> {
    try {
      const result = await Message.findAll({
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
      })

      return result.filter((message) => !message.readStatus?.length).length
    } catch (error) {
      console.error('Error getting unread count:', error)
      throw new Error('Failed to get unread message count')
    }
  }

  /**
   * Get unread messages for all chats of a user
   */
  public static async getUnreadMessagesForUser(
    userId: string,
  ): Promise<{ chatId: string; unreadCount: number }[]> {
    try {
      // First get all chats the user is part of
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
      })

      const chatIds = userChats.map((chat) => chat.chat_id)

      if (chatIds.length === 0) {
        return []
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
        order: [['chat_id', 'ASC']],
      })

      // Count unread messages per chat
      const chatUnreadCounts = new Map<string, number>()

      messages.forEach((message) => {
        const chatId = message.chat_id
        if (!message.readStatus?.length) {
          chatUnreadCounts.set(chatId, (chatUnreadCounts.get(chatId) || 0) + 1)
        }
      })

      return Array.from(chatUnreadCounts.entries())
        .map(([chatId, unreadCount]) => ({
          chatId,
          unreadCount,
        }))
        .filter((result) => result.unreadCount > 0)
    } catch (error) {
      console.error('Error getting unread messages:', error)
      throw new Error('Failed to get unread messages')
    }
  }

  /**
   * Verify if a specific message is read by a user
   */
  public static async isMessageRead(
    messageId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const readStatus = await MessageReadStatus.findOne({
        where: {
          message_id: messageId,
          user_id: userId,
        },
      })
      return !!readStatus
    } catch (error) {
      console.error('Error checking message read status:', error)
      throw new Error('Failed to check message read status')
    }
  }
}
