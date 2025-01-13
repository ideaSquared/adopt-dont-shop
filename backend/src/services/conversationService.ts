import { Conversation, Participant, User } from '../Models'

// Define the expected ParticipantWithUser interface
interface ParticipantWithUser {
  name: string
  email: string
}

// Define the expected ConversationWithParticipants interface
interface ConversationWithParticipants {
  conversation_id: string
  started_by?: string
  started_at?: Date
  last_message?: string
  last_message_at?: Date
  last_message_by?: string
  pet_id?: string
  status?: string
  unread_messages?: number
  messages_count?: number
  created_at?: Date
  updated_at?: Date
  participants: ParticipantWithUser[]
}

export const getAllConversations = async (): Promise<
  ConversationWithParticipants[]
> => {
  const conversations = await Conversation.findAll({
    include: [
      {
        model: Participant,
        as: 'participants',
        include: [
          {
            model: User,
            attributes: ['first_name', 'email'],
          },
        ],
      },
    ],
  })

  return conversations.map((conversation) => {
    const participants =
      conversation.participants?.map((participant) => ({
        name: participant.User?.first_name || '',
        email: participant.User?.email || '',
      })) || []

    return {
      conversation_id: conversation.conversation_id,
      started_by: conversation.started_by,
      started_at: conversation.started_at,
      last_message: conversation.last_message,
      last_message_at: conversation.last_message_at,
      last_message_by: conversation.last_message_by,
      pet_id: conversation.pet_id,
      status: conversation.status,
      unread_messages: conversation.unread_messages,
      messages_count: conversation.messages_count,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      participants,
    }
  })
}
