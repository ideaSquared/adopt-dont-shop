// src/services/ConversationService.ts

import { apiService } from '../api-service'
import { Conversation, Message } from './Conversation'

const API_BASE_URL = '/conversations'

/**
 * Fetch all conversations from the API.
 * @returns Promise resolving to an array of Conversation objects.
 */
export const getConversations = async (): Promise<Conversation[]> => {
  return apiService.get<Conversation[]>(API_BASE_URL)
}

/**
 * Fetch a single conversation by its ID.
 * @param id - The ID of the conversation to fetch.
 * @returns Promise resolving to a Conversation object.
 */
export const getConversationById = async (
  id: string,
): Promise<Conversation | undefined> => {
  return apiService.get<Conversation>(`${API_BASE_URL}/${id}`)
}

/**
 * Fetch all messages by conversation ID.
 * @param id - The ID of the conversation whose messages to fetch.
 * @returns Promise resolving to an array of Message objects.
 */
export const getMessagesByConversationId = async (
  id: string,
): Promise<Message[]> => {
  return apiService.get<Message[]>(`/messages/conversation/${id}`)
}

export default {
  getConversations,
  getConversationById,
  getMessagesByConversationId,
}
