import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const ConnectionStatusSchema = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'reconnecting',
  'error',
]);

export const MessageDeliveryStatusSchema = z.enum([
  'sending',
  'sent',
  'delivered',
  'read',
  'failed',
]);

// ── Sub-schemas ───────────────────────────────────────────────────────────────

export const MessageAttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string(),
  size: z.number(),
  mimeType: z.string(),
  uploadedAt: z.string().optional(),
});

export const MessageReactionSchema = z.object({
  userId: z.string(),
  emoji: z.string(),
  createdAt: z.string(),
});

export const MessageReadReceiptSchema = z.object({
  userId: z.string(),
  readAt: z.string(),
});

export const ParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['user', 'rescue', 'admin']),
  avatarUrl: z.string().optional(),
  isOnline: z.boolean().optional(),
});

// ── Message schema ────────────────────────────────────────────────────────────

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  senderRole: z.enum(['rescue_staff', 'adopter']).optional(),
  senderRescueName: z.string().nullable().optional(),
  content: z.string(),
  timestamp: z.string(),
  type: z.enum(['text', 'image', 'file', 'system']),
  status: MessageDeliveryStatusSchema,
  attachments: z.array(MessageAttachmentSchema).optional(),
  reactions: z.array(MessageReactionSchema).optional(),
  readBy: z.array(MessageReadReceiptSchema).optional(),
  isEdited: z.boolean().optional(),
  editedAt: z.string().optional(),
  replyToId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Conversation schema ───────────────────────────────────────────────────────

export const ConversationSchema = z.object({
  id: z.string(),
  chat_id: z.string().optional(),
  participants: z.array(ParticipantSchema),
  lastMessage: MessageSchema.optional(),
  unreadCount: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
  isActive: z.boolean(),
  petId: z.string().optional(),
  rescueId: z.string().optional(),
  rescueName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['active', 'archived', 'blocked', 'closed']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Typing indicator schema ───────────────────────────────────────────────────

export const TypingIndicatorSchema = z.object({
  conversationId: z.string(),
  userId: z.string(),
  userName: z.string(),
  startedAt: z.string(),
});

// ── Config schemas ────────────────────────────────────────────────────────────

export const ReconnectionConfigSchema = z.object({
  enabled: z.boolean(),
  initialDelay: z.number(),
  maxDelay: z.number(),
  maxAttempts: z.number(),
  backoffMultiplier: z.number(),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;
export type MessageDeliveryStatus = z.infer<typeof MessageDeliveryStatusSchema>;
export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;
export type MessageReaction = z.infer<typeof MessageReactionSchema>;
export type MessageReadReceipt = z.infer<typeof MessageReadReceiptSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type TypingIndicator = z.infer<typeof TypingIndicatorSchema>;
export type ReconnectionConfig = z.infer<typeof ReconnectionConfigSchema>;
