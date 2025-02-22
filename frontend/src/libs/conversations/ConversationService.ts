// src/services/ConversationService.ts

import { apiService } from '../api-service'
import { Conversation, ConversationStatus, Message } from './Conversation'

const API_BASE_URL = '/chats'
const ADMIN_BASE_URL = '/admin'

/**
 * Fetch all conversations from the API.
 * @returns Promise resolving to an array of Conversation objects.
 */
export const getConversations = async (): Promise<Conversation[]> => {
  return apiService.get<Conversation[]>(API_BASE_URL)
}

/**
 * Fetch all conversations (admin only).
 * @returns Promise resolving to an array of Conversation objects.
 */
export const getAllConversations = async (): Promise<Conversation[]> => {
  return apiService.get<Conversation[]>(`${ADMIN_BASE_URL}/conversations`)
}

/**
 * Fetch conversations for a specific rescue.
 * The rescue ID is obtained from the authenticated user's context.
 * @returns Promise resolving to an array of Conversation objects.
 */
export const getConversationsByRescueId = async (): Promise<Conversation[]> => {
  try {
    return await apiService.get<Conversation[]>(
      `${API_BASE_URL}/rescue/conversations`,
    )
  } catch (error) {
    throw error
  }
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
  return apiService.get<Message[]>(`${API_BASE_URL}/${id}/messages`)
}

/**
 * Update conversation status.
 * @param chatId - The ID of the conversation to update.
 * @param status - The new status.
 * @param rescueId - Optional rescue ID for rescue-specific operations.
 */
export const updateConversationStatus = async (
  chatId: string,
  status: ConversationStatus,
  rescueId?: string,
): Promise<void> => {
  const endpoint = rescueId
    ? `${API_BASE_URL}/rescue/${rescueId}/chats/${chatId}/status`
    : `${ADMIN_BASE_URL}/chats/${chatId}/status`

  await apiService.patch(endpoint, { status })
}

/**
 * Delete a message.
 * @param messageId - The ID of the message to delete.
 * @param rescueId - Optional rescue ID for rescue-specific operations.
 */
export const deleteMessage = async (
  messageId: string,
  rescueId?: string,
): Promise<void> => {
  const endpoint = rescueId
    ? `${API_BASE_URL}/rescue/${rescueId}/messages/${messageId}`
    : `${ADMIN_BASE_URL}/messages/${messageId}`

  await apiService.delete(endpoint)
}

export default {
  getConversations,
  getAllConversations,
  getConversationsByRescueId,
  getConversationById,
  getMessagesByConversationId,
  updateConversationStatus,
  deleteMessage,
}
