/**
 * Enums for chat system to replace magic strings
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
}

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  CLOSED = 'closed',
}

export const CHAT_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 10000,
  MAX_ATTACHMENTS: 10,
  MAX_ATTACHMENT_SIZE: 50 * 1024 * 1024, // 50MB
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
