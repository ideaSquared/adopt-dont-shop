/**
 * Chat system types and enums
 */

export enum ChatStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',
  ARCHIVED = 'archived',
}

export enum ChatType {
  DIRECT = 'direct',
  GROUP = 'group',
  APPLICATION = 'application',
  GENERAL = 'general',
  SUPPORT = 'support',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
}

export enum MessageContentFormat {
  PLAIN = 'plain',
  MARKDOWN = 'markdown',
  HTML = 'html',
}

export enum ParticipantRole {
  RESCUE = 'rescue',
  USER = 'user',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  CLOSED = 'closed',
}

export const CHAT_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 10000,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_ATTACHMENTS: 10,
  MAX_ATTACHMENT_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_PARTICIPANTS: 10,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  TYPING_TIMEOUT: 3000, // 3 seconds
  MESSAGE_BATCH_SIZE: 50,
} as const;

// Interface definitions
export interface ChatAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface ChatCreateData {
  participantIds: string[];
  rescueId?: string;
  applicationId?: string;
  petId?: string;
  title?: string;
  description?: string;
  type?: ChatType;
  initialMessage?: string;
}

export interface ChatUpdateData {
  title?: string;
  description?: string;
  status?: ChatStatus;
}

export interface MessageCreateData {
  chatId: string;
  content: string;
  type?: MessageType;
  attachments?: MessageAttachment[];
}

export interface MessageUpdateData {
  content?: string;
  editedAt?: Date;
}

export interface ChatMessage {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  content_format: MessageContentFormat;
  type: MessageType;
  attachments: ChatAttachment[];
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  participant_id: string;
  chat_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  last_read_at?: string;
}

export interface Chat {
  chat_id: string;
  rescue_id?: string;
  pet_id?: string;
  application_id?: string;
  type: ChatType;
  status: ChatStatus;
  title?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  participants: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatListResponse {
  chats: Chat[];
  total: number;
  page: number;
  totalPages: number;
}

export interface MessageListResponse {
  messages: ChatMessage[];
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
