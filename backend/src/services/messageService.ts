import { Message, User } from '../Models/'

export const getAllMessages = async () => {
  return await Message.findAll()
}

export const getMessageById = async (id: string) => {
  return await Message.findByPk(id)
}

export const createMessage = async (messageData: Partial<Message>) => {
  return await Message.create(messageData)
}

interface MessageWithSender {
  conversation_id: string
  sender_id: string
  sender_name: string
  message_text: string
  sent_at: Date
  status: string
}

export const getMessagesByConversationId = async (
  conversationId: string,
): Promise<MessageWithSender[]> => {
  const messages = await Message.findAll({
    where: {
      conversation_id: conversationId,
    },
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['first_name'],
      },
    ],
    order: [['sent_at', 'ASC']],
  })

  // Map the results to a flat structure
  return messages.map((message) => ({
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    sender_name: message.User?.first_name || 'Unknown',
    message_text: message.message_text,
    sent_at: message.sent_at,
    status: message.status,
  }))
}
