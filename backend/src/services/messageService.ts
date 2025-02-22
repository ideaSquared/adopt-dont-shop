import { Message, User } from '../Models'

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
