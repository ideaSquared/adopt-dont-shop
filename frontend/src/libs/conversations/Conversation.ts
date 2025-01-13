type ID = string
type Timestamp = string
type Email = string
type Status = string

export interface Conversation {
  conversation_id: ID
  started_by: string
  started_at: Timestamp
  last_message: string
  last_message_at: Timestamp
  last_message_by: string
  pet_id: ID
  status: Status
  unread_messages: number
  messages_count: number
  created_at: Timestamp
  updated_at: Timestamp
  participants: Participant[]
  started_by_email: Email
  last_message_by_email: Email
}

export interface Participant {
  email: Email
  name: string
}

export interface Message {
  conversation_id: ID
  sender_id: ID
  sender_name: string
  message_text: string
  sent_at: Timestamp
  status: Status
}
