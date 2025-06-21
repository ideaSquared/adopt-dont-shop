import { Chat } from '../models/Chat';
import { Message } from '../models/Message';

export interface ChatCreateData {
  participantIds: string[];
  rescueId?: string;
  applicationId?: string;
  title?: string;
  description?: string;
  type?: string;
}

export interface ChatUpdateData {
  title?: string;
  description?: string;
  status?: string;
}

export interface MessageCreateData {
  chatId: string;
  content: string;
  type?: string;
  attachments?: any[];
}

export interface MessageUpdateData {
  content?: string;
  editedAt?: Date;
}

export interface ChatListResponse {
  chats: Chat[];
  total: number;
  page: number;
  totalPages: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ChatStatistics {
  totalChats: number;
  totalMessages: number;
  activeChats: number;
  averageMessagesPerChat: number;
  messageGrowthRate: number;
  userEngagement: number;
} 