import { z } from 'zod';

import type { Conversation, Message } from '../schemas';

// The gateway serves chats and messages in the chat service's own shape
// (`chatId`, `participantUserIds`, `messageId`, `senderUserId`, `body`, a proto
// `CHAT_STATUS_*` status). The chat UI is built on Conversation / Message, so
// every REST response and socket event is mapped through here.

export const GatewayChatSchema = z.object({
  chatId: z.string(),
  participantUserIds: z.array(z.string()).optional(),
  lastMessagePreview: z.string().optional(),
  lastMessageAt: z.string().optional(),
  lastMessageSenderId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.string().optional(),
  petId: z.string().optional(),
  rescueId: z.string().optional(),
});
export type GatewayChat = z.infer<typeof GatewayChatSchema>;

export const GatewayMessageSchema = z.object({
  messageId: z.string(),
  chatId: z.string(),
  senderUserId: z.string(),
  body: z.string().optional(),
  content: z.string().optional(),
  // Socket events carry no timestamp; REST responses do.
  createdAt: z.string().optional(),
});
export type GatewayMessage = z.infer<typeof GatewayMessageSchema>;

const CONVERSATION_STATUSES = ['active', 'archived', 'blocked', 'closed'] as const;
type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

const toConversationStatus = (status: string | undefined): ConversationStatus => {
  const name = (status ?? '').replace(/^CHAT_STATUS_/, '').toLowerCase();
  return CONVERSATION_STATUSES.find((s) => s === name) ?? 'active';
};

export const toMessage = (message: GatewayMessage): Message => ({
  id: message.messageId,
  conversationId: message.chatId,
  senderId: message.senderUserId,
  senderName: '',
  content: message.content ?? message.body ?? '',
  timestamp: message.createdAt ?? new Date().toISOString(),
  type: 'text',
  status: 'delivered',
});

export const toConversation = (chat: GatewayChat): Conversation => {
  const status = toConversationStatus(chat.status);
  const lastMessage =
    chat.lastMessagePreview !== undefined && chat.lastMessageAt
      ? toMessage({
          messageId: `${chat.chatId}:last`,
          chatId: chat.chatId,
          senderUserId: chat.lastMessageSenderId ?? '',
          body: chat.lastMessagePreview,
          createdAt: chat.lastMessageAt,
        })
      : undefined;
  return {
    id: chat.chatId,
    chat_id: chat.chatId,
    participants: (chat.participantUserIds ?? []).map((id) => ({ id, name: '', type: 'user' })),
    lastMessage,
    unreadCount: 0,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    isActive: status === 'active',
    status,
    petId: chat.petId,
    rescueId: chat.rescueId,
  };
};
