import { Op } from 'sequelize'
import {
  Chat,
  ChatParticipant,
  Message,
  MessageReadStatus,
  User,
} from '../Models'

interface MessageInput {
  chat_id: string
  sender_id: string
  content: string
  content_format?: 'plain' | 'markdown' | 'html'
  attachments?: Array<{
    attachment_id: string
    filename: string
    originalName: string
    mimeType: string
    size: number
    url: string
  }>
}

export interface MessageWithSender extends Message {
  sender: User
}

export const createMessage = async (data: MessageInput): Promise<Message> => {
  return await Message.create({
    ...data,
    content_format: data.content_format || 'plain',
  })
}

export const getMessageById = async (id: string): Promise<Message | null> => {
  return await Message.findByPk(id, {
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['user_id', 'first_name', 'last_name'],
      },
    ],
  })
}

export const getMessagesByConversationId = async (
  conversationId: string,
): Promise<Message[]> => {
  return await Message.findAll({
    where: { chat_id: conversationId },
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['user_id', 'first_name', 'last_name'],
      },
    ],
    order: [['created_at', 'DESC']],
  })
}

export const getMessagesByChat = async (chatId: string): Promise<Message[]> => {
  return await Message.findAll({
    where: { chat_id: chatId },
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['user_id', 'first_name', 'last_name'],
      },
    ],
    order: [['created_at', 'DESC']],
  })
}

export const getAllMessages = async (): Promise<Message[]> => {
  return await Message.findAll({
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['user_id', 'first_name', 'last_name'],
      },
    ],
    order: [['created_at', 'DESC']],
  })
}

export const updateMessage = async (
  id: string,
  data: Partial<Message>,
): Promise<Message | null> => {
  const message = await Message.findByPk(id)
  if (!message) return null
  return await message.update(data)
}

export const deleteMessage = async (id: string): Promise<boolean> => {
  const message = await Message.findByPk(id)
  if (!message) return false
  await message.destroy()
  return true
}

export const markMessageAsRead = async (
  messageId: string,
  userId: string,
): Promise<void> => {
  await MessageReadStatus.create({
    message_id: messageId,
    user_id: userId,
  })
}

export const markAllMessagesAsRead = async (
  chatId: string,
  userId: string,
): Promise<void> => {
  const messages = await Message.findAll({
    where: { chat_id: chatId },
    attributes: ['message_id'],
  })

  const messageIds = messages.map((m) => m.message_id)

  // Create read status for all unread messages
  await Promise.all(
    messageIds.map((messageId) =>
      MessageReadStatus.findOrCreate({
        where: {
          message_id: messageId,
          user_id: userId,
        },
      }),
    ),
  )
}

export const getUnreadMessageCount = async (
  chatId: string,
  userId: string,
): Promise<number> => {
  const messages = await Message.findAll({
    where: {
      chat_id: chatId,
      sender_id: { [Op.ne]: userId }, // Don't count user's own messages
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

  return messages.filter((message) => !message.readStatus?.length).length
}

export const getUnreadMessagesForUser = async (
  userId: string,
): Promise<{ chatId: string; unreadCount: number }[]> => {
  const chats = await Chat.findAll({
    include: [
      {
        model: Message,
        as: 'Messages',
        where: {
          sender_id: { [Op.ne]: userId },
        },
        required: false,
        include: [
          {
            model: MessageReadStatus,
            as: 'readStatus',
            where: { user_id: userId },
            required: false,
          },
        ],
      },
    ],
  })

  return chats.map((chat) => ({
    chatId: chat.chat_id,
    unreadCount:
      chat.Messages?.filter((message: Message) => !message.readStatus?.length)
        .length || 0,
  }))
}

export const getUserConversations = async (userId: string): Promise<Chat[]> => {
  return await Chat.findAll({
    include: [
      {
        model: Message,
        as: 'Messages',
        separate: true,
        order: [['created_at', 'DESC']],
      },
      {
        model: ChatParticipant,
        as: 'participants',
        include: [
          {
            model: User,
            as: 'participant',
            attributes: ['user_id', 'first_name', 'last_name', 'email'],
          },
        ],
      },
    ],
    where: {
      '$participants.participant_id$': userId,
    },
    order: [['updated_at', 'DESC']],
  })
}
