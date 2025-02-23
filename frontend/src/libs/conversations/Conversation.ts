type ID = string
type Timestamp = string
type Email = string
type ConversationStatus = 'active' | 'archived' | 'locked'

interface User {
  user_id: string
  first_name: string
  last_name: string
  email: string
}

interface Participant {
  chat_participant_id: string
  chat_id: string
  participant_id: string
  role: 'rescue' | 'user'
  participant: User
}

interface Message {
  message_id: string
  chat_id: string
  sender_id: string
  content: string
  content_format: 'plain' | 'markdown' | 'html'
  created_at: string
  updated_at: string
  User: User
}

export interface Conversation {
  chat_id: string
  application_id?: string
  status: ConversationStatus
  created_at: Timestamp
  updated_at: Timestamp
  participants: Participant[]
  Messages: Message[]
}

export type { ConversationStatus, Message, Participant, User }
