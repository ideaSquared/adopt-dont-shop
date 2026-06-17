import {
  ConnectionStatusSchema,
  ConversationSchema,
  MessageDeliveryStatusSchema,
  MessageSchema,
  ParticipantSchema,
  ReconnectionConfigSchema,
  TypingIndicatorSchema,
} from '../schemas';

describe('chat schemas', () => {
  describe('ConnectionStatusSchema', () => {
    it('accepts the documented connection states', () => {
      for (const status of ['disconnected', 'connecting', 'connected', 'reconnecting', 'error']) {
        expect(ConnectionStatusSchema.parse(status)).toBe(status);
      }
    });

    it('rejects an unknown connection state', () => {
      expect(ConnectionStatusSchema.safeParse('paused').success).toBe(false);
    });
  });

  describe('MessageDeliveryStatusSchema', () => {
    it('accepts the documented delivery states', () => {
      for (const status of ['sending', 'sent', 'delivered', 'read', 'failed']) {
        expect(MessageDeliveryStatusSchema.parse(status)).toBe(status);
      }
    });
  });

  describe('ParticipantSchema', () => {
    it('parses a minimal participant', () => {
      const participant = ParticipantSchema.parse({
        id: 'user-1',
        name: 'Alex',
        type: 'user',
      });
      expect(participant.id).toBe('user-1');
      expect(participant.isOnline).toBeUndefined();
    });

    it('rejects an invalid participant type', () => {
      const result = ParticipantSchema.safeParse({
        id: 'user-1',
        name: 'Alex',
        type: 'robot',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('MessageSchema', () => {
    const baseMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      senderName: 'Alex',
      content: 'Hello',
      timestamp: '2026-01-01T00:00:00Z',
      type: 'text' as const,
      status: 'sent' as const,
    };

    it('parses a minimal text message without optional fields', () => {
      const parsed = MessageSchema.parse(baseMessage);
      expect(parsed.id).toBe('msg-1');
      expect(parsed.sequence).toBeUndefined();
      expect(parsed.reactions).toBeUndefined();
    });

    it('parses a fully populated message with attachments, reactions and read receipts', () => {
      const parsed = MessageSchema.parse({
        ...baseMessage,
        sequence: 42,
        senderRole: 'rescue_staff',
        senderRescueName: 'Happy Tails',
        attachments: [
          {
            id: 'att-1',
            filename: 'photo.png',
            url: 'https://cdn.example.com/photo.png',
            size: 1024,
            mimeType: 'image/png',
          },
        ],
        reactions: [{ userId: 'user-2', emoji: '\u{1F44D}', createdAt: '2026-01-01T00:00:01Z' }],
        readBy: [{ userId: 'user-2', readAt: '2026-01-01T00:00:02Z' }],
        isEdited: true,
        editedAt: '2026-01-01T00:00:03Z',
        metadata: { important: true },
      });
      expect(parsed.sequence).toBe(42);
      expect(parsed.attachments).toHaveLength(1);
      expect(parsed.reactions?.[0].emoji).toBe('\u{1F44D}');
    });

    it('rejects a message with an unknown type', () => {
      expect(MessageSchema.safeParse({ ...baseMessage, type: 'video' }).success).toBe(false);
    });

    it('rejects a message missing required content', () => {
      const { content: _omit, ...withoutContent } = baseMessage;
      expect(MessageSchema.safeParse(withoutContent).success).toBe(false);
    });
  });

  describe('ConversationSchema', () => {
    const baseConversation = {
      id: 'conv-1',
      participants: [{ id: 'user-1', name: 'Alex', type: 'user' as const }],
      unreadCount: 0,
      updatedAt: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      isActive: true,
    };

    it('parses a minimal conversation', () => {
      const parsed = ConversationSchema.parse(baseConversation);
      expect(parsed.id).toBe('conv-1');
      expect(parsed.priority).toBeUndefined();
    });

    it('parses a conversation with priority and status enums', () => {
      const parsed = ConversationSchema.parse({
        ...baseConversation,
        priority: 'urgent',
        status: 'archived',
        tags: ['vip'],
      });
      expect(parsed.priority).toBe('urgent');
      expect(parsed.status).toBe('archived');
    });

    it('rejects an invalid status enum value', () => {
      expect(ConversationSchema.safeParse({ ...baseConversation, status: 'deleted' }).success).toBe(
        false
      );
    });
  });

  describe('TypingIndicatorSchema', () => {
    it('parses a typing indicator', () => {
      const parsed = TypingIndicatorSchema.parse({
        conversationId: 'conv-1',
        userId: 'user-1',
        userName: 'Alex',
        startedAt: '2026-01-01T00:00:00Z',
      });
      expect(parsed.userName).toBe('Alex');
    });
  });

  describe('ReconnectionConfigSchema', () => {
    it('parses a full reconnection config', () => {
      const parsed = ReconnectionConfigSchema.parse({
        enabled: true,
        initialDelay: 500,
        maxDelay: 10000,
        maxAttempts: 5,
        backoffMultiplier: 2,
      });
      expect(parsed.enabled).toBe(true);
      expect(parsed.backoffMultiplier).toBe(2);
    });

    it('rejects a config missing required fields', () => {
      expect(ReconnectionConfigSchema.safeParse({ enabled: true }).success).toBe(false);
    });
  });
});
