import { Chat, ChatParticipant, Message, User } from '../Models'
import sequelize from '../sequelize'
import { AuditLogger } from './auditLogService'

type ChatStatus = 'active' | 'archived'

// Add interface for Chat with associations
interface ChatWithAssociations extends Chat {
  Messages?: Message[]
  participants?: ChatParticipant[]
}

/**
 * Create a new chat between a rescue and a user
 */
export const createChat = async (
  userId: string,
  rescueId: string,
  applicationId?: string,
): Promise<Chat> => {
  const transaction = await sequelize.transaction()

  try {
    // Create the chat with rescue_id
    const chat = await Chat.create(
      {
        rescue_id: rescueId,
        application_id: applicationId,
        status: 'active',
      },
      { transaction },
    )

    // Add the user as a participant
    await ChatParticipant.create(
      {
        chat_id: chat.chat_id,
        participant_id: userId,
        role: 'user',
      },
      { transaction },
    )

    await transaction.commit()
    return chat
  } catch (error: unknown) {
    await transaction.rollback()
    throw new Error(
      `Failed to create chat: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    )
  }
}

/**
 * Get all chats for a user based on their role and rescue affiliation
 */
export const getAllChatsForUser = async (
  userId: string,
  userRescueId?: string | null,
) => {
  try {
    // If user is part of a rescue, get all chats for that rescue
    if (userRescueId) {
      return getChatsByRescueId(userRescueId)
    }

    // Otherwise, get only chats where the user is a direct participant
    return await Chat.findAll({
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          required: true,
          include: [
            {
              model: User,
              as: 'participant',
              attributes: ['user_id', 'first_name', 'last_name', 'email'],
            },
          ],
        },
        {
          model: Message,
          as: 'Messages',
          required: false,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['user_id', 'first_name', 'last_name', 'email'],
            },
          ],
        },
      ],
      where: sequelize.literal(
        `EXISTS (
          SELECT 1 FROM chat_participants 
          WHERE chat_participants.chat_id = "Chat"."chat_id" 
          AND chat_participants.participant_id = '${userId}'
          AND chat_participants.role = 'user'
        )`,
      ),
      order: [['created_at', 'DESC']],
    })
  } catch (error) {
    AuditLogger.logAction(
      'Chat',
      `Failed to fetch chats for user: ${(error as Error).message}`,
      'ERROR',
    )
    throw error
  }
}

/**
 * Get a chat by ID with its participants and messages
 */
export const getChatById = async (chatId: string) => {
  try {
    return await Chat.findByPk(chatId, {
      include: [
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
        {
          model: Message,
          as: 'Messages',
          limit: 50,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['user_id', 'first_name', 'last_name', 'email'],
            },
          ],
        },
      ],
    })
  } catch (error) {
    throw error
  }
}

/**
 * Update a chat's status
 */
export const updateChatStatus = async (chatId: string, status: ChatStatus) => {
  try {
    const chat = await Chat.findByPk(chatId)

    if (!chat) {
      throw new Error('Chat not found')
    }

    await chat.update({ status })

    AuditLogger.logAction(
      'Chat',
      `Chat ${chatId} updated - Status: ${status}`,
      'INFO',
    )

    return chat
  } catch (error) {
    AuditLogger.logAction(
      'Chat',
      `Failed to update chat: ${(error as Error).message}`,
      'ERROR',
    )
    throw error
  }
}

/**
 * Delete a chat
 */
export const deleteChat = async (chatId: string) => {
  try {
    const chat = await Chat.findByPk(chatId)

    if (!chat) {
      throw new Error('Chat not found')
    }

    await chat.destroy()

    AuditLogger.logAction('Chat', `Chat ${chatId} deleted`, 'INFO')
  } catch (error) {
    AuditLogger.logAction(
      'Chat',
      `Failed to delete chat: ${(error as Error).message}`,
      'ERROR',
    )
    throw error
  }
}

/**
 * Get all conversations (admin only)
 */
export const getAllConversations = async () => {
  try {
    return await Chat.findAll({
      include: [
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
        {
          model: Message,
          as: 'Messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['user_id', 'first_name', 'last_name', 'email'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    })
  } catch (error) {
    AuditLogger.logAction(
      'Chat',
      `Failed to fetch all conversations: ${(error as Error).message}`,
      'ERROR',
    )
    throw error
  }
}

/**
 * Get all chats for a rescue - includes all chats where the rescue is a participant
 */
export const getChatsByRescueId = async (rescueId: string): Promise<Chat[]> => {
  try {
    const chats = await Chat.findAll({
      where: {
        rescue_id: rescueId,
      },
      include: [
        {
          model: Message,
          as: 'Messages',
          order: [['created_at', 'DESC']],
          limit: 1,
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['user_id', 'first_name', 'last_name', 'email'],
            },
          ],
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
      order: [['created_at', 'DESC']],
    })

    return chats
  } catch (error: unknown) {
    throw new Error(
      `Failed to fetch chats for rescue: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    )
  }
}
