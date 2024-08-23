import { Conversation, Message } from './Conversation'

const API_URL = 'http://localhost:5000/api' // Base API URL

// Fetch all conversations from the API
const getConversations = async (): Promise<Conversation[]> => {
  const response = await fetch(`${API_URL}/conversations`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch conversations')
  }

  const data = await response.json()
  return data // Assuming the response JSON is structured as { conversations: Conversation[] }
}

// Fetch a single conversation by its ID
const getConversationById = async (
  id: string,
): Promise<Conversation | undefined> => {
  const response = await fetch(`${API_URL}/conversations/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation with id: ${id}`)
  }

  const data = await response.json()
  return data // Assuming the response JSON is structured as { conversation: Conversation }
}

// Fetch all messages by conversation ID from the API
const getMessagesByConversationId = async (id: string): Promise<Message[]> => {
  const response = await fetch(`${API_URL}/messages/conversation/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch messages for conversation with id: ${id}`)
  }

  const data = await response.json()
  return data // Assuming the response JSON is structured as { messages: Message[] }
}

export default {
  getConversations,
  getConversationById,
  getMessagesByConversationId,
}
