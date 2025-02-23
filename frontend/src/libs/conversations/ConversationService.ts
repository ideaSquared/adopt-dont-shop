// src/services/ConversationService.ts

import { apiService } from '../api-service'
import { Conversation, ConversationStatus, Message } from './Conversation'

const API_BASE_URL = '/chats'

type AdminChatStatus = 'active' | 'locked' | 'archived'

/**
 * Fetch all conversations from the API.
 * @returns Promise resolving to an array of Conversation objects.
 */
export const getConversations = async (): Promise<Conversation[]> => {
  return apiService.get<Conversation[]>(`${API_BASE_URL}/admin/conversations`)
}

/**
 * Fetch all conversations (admin only).
 * @returns Promise resolving to an array of Conversation objects.
 */
export const getAllConversations = async (): Promise<Conversation[]> => {
  return apiService.get<Conversation[]>(`${API_BASE_URL}/admin/conversations`)
}

/**
 * Fetch conversations for a specific rescue.
 * The rescue ID is obtained from the authenticated user's context.
 * @returns Promise resolving to an array of Conversation objects.
 */
export const getConversationsByRescueId = async (): Promise<Conversation[]> => {
  return apiService.get<Conversation[]>(`${API_BASE_URL}/rescue/conversations`)
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
 * @param status - The new status (active/archived only).
 * @param rescueId - Optional rescue ID for rescue-specific operations.
 */
export const updateConversationStatus = async (
  chatId: string,
  status: ConversationStatus,
  rescueId?: string,
): Promise<void> => {
  const endpoint = rescueId
    ? `${API_BASE_URL}/rescue/${rescueId}/chats/${chatId}/status`
    : `${API_BASE_URL}/${chatId}/status`

  await apiService.patch(endpoint, { status })
}

/**
 * Update chat status (admin only) - supports locking chats
 * @param chatId - The ID of the chat to update
 * @param status - The new status (active/locked/archived)
 */
export const updateChatStatusAdmin = async (
  chatId: string,
  status: AdminChatStatus,
): Promise<void> => {
  await apiService.patch(`${API_BASE_URL}/${chatId}/status`, { status })
}

/**
 * Delete a message.
 * @param messageId - The ID of the message to delete.
 * @param chatId - The ID of the chat containing the message.
 */
export const deleteMessage = async (
  messageId: string,
  chatId: string,
): Promise<void> => {
  await apiService.delete(`${API_BASE_URL}/${chatId}/messages/${messageId}`)
}

/**
 * Delete a chat and all its messages
 * @param chatId - The ID of the chat to delete
 */
export const deleteChat = async (chatId: string): Promise<void> => {
  await apiService.delete(`${API_BASE_URL}/${chatId}`)
}

/**
 * Delete a message (admin only)
 * @param messageId - The ID of the message to delete
 */
export const deleteMessageAdmin = async (messageId: string): Promise<void> => {
  await apiService.delete(`${API_BASE_URL}/messages/${messageId}`)
}

/**
 * Bulk delete messages (admin only)
 * @param messageIds - Array of message IDs to delete
 */
export const bulkDeleteMessages = async (
  messageIds: string[],
): Promise<void> => {
  await apiService.post(`${API_BASE_URL}/messages/bulk-delete`, { messageIds })
}

export default {
  getConversations,
  getAllConversations,
  getConversationsByRescueId,
  getConversationById,
  getMessagesByConversationId,
  updateConversationStatus,
  updateChatStatusAdmin,
  deleteMessage,
  deleteChat,
  deleteMessageAdmin,
  bulkDeleteMessages,
}
