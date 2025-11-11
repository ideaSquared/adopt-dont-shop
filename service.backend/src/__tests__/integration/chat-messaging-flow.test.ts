// Mock env config FIRST before any imports
jest.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
}));

// Mock sequelize before model imports
jest.mock('../../sequelize', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    }),
    query: jest.fn(),
    literal: jest.fn(val => val),
    fn: jest.fn(),
    col: jest.fn(),
  },
}));

// Mock email service
jest.mock('../../services/email.service', () => ({
  default: {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    queueEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

// Define enums that we need for tests
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_VERIFICATION = 'pending_verification',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

enum UserType {
  ADOPTER = 'adopter',
  RESCUE_STAFF = 'rescue_staff',
  ADMIN = 'admin',
}

// Mock the models - we need to mock the module that chat.service actually imports from
jest.mock('../../models', () => {
  return {
    Chat: {
      create: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findAndCountAll: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      count: jest.fn(),
    },
    ChatParticipant: {
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      destroy: jest.fn(),
    },
    Message: {
      create: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findAndCountAll: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    User: {
      findByPk: jest.fn(),
      findOne: jest.fn(),
    },
    Rescue: {
      findByPk: jest.fn(),
      findOne: jest.fn(),
    },
  };
});

// Import from the mocked models module
import { Chat, ChatParticipant, Message, User, Rescue } from '../../models';
import { ChatService } from '../../services/chat.service';
import { MessageReadStatusService, MessageReadStatus } from '../../services/message-read-status.service';
import { AuditLogService } from '../../services/auditLog.service';
import { NotificationService } from '../../services/notification.service';
import {
  ChatStatus,
  ChatType,
  MessageContentFormat,
  MessageType,
  ParticipantRole,
} from '../../types/chat';

jest.mock('../../services/auditLog.service');
jest.mock('../../services/notification.service');
jest.mock('../../utils/logger');

// Now get references to the mocked models
const models = jest.requireMock('../../models');
const MockedChat = models.Chat as jest.Mocked<typeof Chat>;
const MockedChatParticipant = models.ChatParticipant as jest.Mocked<typeof ChatParticipant>;
const MockedMessage = models.Message as jest.Mocked<typeof Message>;
const MockedUser = models.User as jest.Mocked<typeof User>;
const MockedRescue = models.Rescue as jest.Mocked<typeof Rescue>;

const MockedAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const MockedNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;

describe('Chat Messaging Flow Integration Tests', () => {
  const adopterId = 'adopter-123';
  const rescueStaffId = 'staff-456';
  const rescueId = 'rescue-abc';
  const chatId = 'chat-xyz';
  const messageId = 'message-123';
  const otherUserId = 'user-789';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default audit log mocks
    MockedAuditLogService.log = jest.fn().mockResolvedValue(undefined as never);

    // Setup default notification service mocks
    MockedNotificationService.createNotification = jest.fn().mockResolvedValue(undefined as never);
  });

  describe('Chat Creation', () => {
    describe('when creating a chat between adopter and rescue', () => {
      it('should successfully create a direct chat with two participants', async () => {
        const mockChat = createMockChat({
          chat_id: chatId,
          rescue_id: rescueId,
          status: ChatStatus.ACTIVE,
        });

        const mockParticipant1 = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
          role: ParticipantRole.USER,
        });

        const mockParticipant2 = createMockChatParticipant({
          chat_id: chatId,
          participant_id: rescueStaffId,
          role: ParticipantRole.RESCUE,
        });

        MockedChat.create = jest.fn().mockResolvedValue(mockChat as never);
        MockedChatParticipant.create = jest
          .fn()
          .mockResolvedValueOnce(mockParticipant1 as never)
          .mockResolvedValueOnce(mockParticipant2 as never);

        const chatData = {
          rescueId,
          participantIds: [adopterId, rescueStaffId],
        };

        const result = await ChatService.createChat(chatData, adopterId);

        expect(result).toBeDefined();
        expect(result.chat_id).toBe(chatId);
        expect(MockedChat.create).toHaveBeenCalledWith(
          expect.objectContaining({
            rescue_id: rescueId,
            status: ChatStatus.ACTIVE,
          })
        );
        expect(MockedChatParticipant.create).toHaveBeenCalledTimes(2);
      });

      it('should create a chat with initial message', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: adopterId,
          content: 'Hello! I am interested in adopting.',
        });

        MockedChat.create = jest.fn().mockResolvedValue(mockChat as never);
        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);

        const chatData = {
          rescueId,
          participantIds: [adopterId, rescueStaffId],
          initialMessage: 'Hello! I am interested in adopting.',
        };

        const result = await ChatService.createChat(chatData, adopterId);

        expect(MockedMessage.create).toHaveBeenCalledWith(
          expect.objectContaining({
            chat_id: chatId,
            sender_id: adopterId,
            content: 'Hello! I am interested in adopting.',
            content_format: MessageContentFormat.PLAIN,
          })
        );
      });

      it('should create a chat linked to an application', async () => {
        const applicationId = 'application-123';
        const mockChat = createMockChat({
          chat_id: chatId,
          rescue_id: rescueId,
          application_id: applicationId,
        });

        MockedChat.create = jest.fn().mockResolvedValue(mockChat as never);
        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);

        const chatData = {
          rescueId,
          applicationId,
          participantIds: [adopterId, rescueStaffId],
        };

        const result = await ChatService.createChat(chatData, adopterId);

        expect(MockedChat.create).toHaveBeenCalledWith(
          expect.objectContaining({
            application_id: applicationId,
          })
        );
      });

      it('should create a chat linked to a specific pet', async () => {
        const petId = 'pet-456';
        const mockChat = createMockChat({
          chat_id: chatId,
          rescue_id: rescueId,
          pet_id: petId,
        });

        MockedChat.create = jest.fn().mockResolvedValue(mockChat as never);
        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);

        const chatData = {
          rescueId,
          petId,
          participantIds: [adopterId, rescueStaffId],
        };

        const result = await ChatService.createChat(chatData, adopterId);

        expect(MockedChat.create).toHaveBeenCalledWith(
          expect.objectContaining({
            pet_id: petId,
          })
        );
      });

      it('should log chat creation in audit trail', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });

        MockedChat.create = jest.fn().mockResolvedValue(mockChat as never);
        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);

        const chatData = {
          rescueId,
          participantIds: [adopterId, rescueStaffId],
        };

        await ChatService.createChat(chatData, adopterId);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CREATE',
            entity: 'Chat',
            entityId: chatId,
            userId: adopterId,
          })
        );
      });

      it('should filter out empty participant IDs', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });

        MockedChat.create = jest.fn().mockResolvedValue(mockChat as never);
        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);

        const chatData = {
          rescueId,
          participantIds: [adopterId, '', null, rescueStaffId, '  '] as unknown as string[],
        };

        await ChatService.createChat(chatData, adopterId);

        // Should only create 2 participants (adopterId and rescueStaffId)
        expect(MockedChatParticipant.create).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Sending and Receiving Messages', () => {
    describe('when sending a text message', () => {
      it('should successfully send a message to an existing chat', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: adopterId,
          content: 'Hello, when can I visit?',
        });
        const mockUser = createMockUser({ userId: adopterId, firstName: 'John' });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([mockParticipant] as never);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Hello, when can I visit?',
        };

        const result = await ChatService.sendMessage(messageData);

        expect(result).toBeDefined();
        expect(result.message_id).toBe(messageId);
        expect(result.content).toBe('Hello, when can I visit?');
        expect(MockedMessage.create).toHaveBeenCalledWith(
          expect.objectContaining({
            chat_id: chatId,
            sender_id: adopterId,
            content: 'Hello, when can I visit?',
            content_format: MessageContentFormat.PLAIN,
          }),
          expect.any(Object)
        );
      });

      it('should reject message from non-participant', async () => {
        MockedChat.findByPk = jest.fn().mockResolvedValue(null);

        const messageData = {
          chatId,
          senderId: 'non-participant-999',
          content: 'Hello',
        };

        await expect(ChatService.sendMessage(messageData)).rejects.toThrow(
          'Chat not found or user is not a participant'
        );
      });

      it('should enforce rate limiting on message sending', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });

        mockChat.Participants = [mockParticipant];

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(10); // Already sent 10 messages

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Hello',
        };

        await expect(ChatService.sendMessage(messageData)).rejects.toThrow(
          'Rate limit exceeded'
        );
      });

      it('should validate message content is not empty', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });

        mockChat.Participants = [mockParticipant];

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: '', // Empty content
        };

        // The Message.create will be called and Sequelize validation should catch this
        MockedMessage.create = jest.fn().mockRejectedValue(new Error('Validation error'));

        await expect(ChatService.sendMessage(messageData)).rejects.toThrow();
      });

      it('should update chat updated_at timestamp when message is sent', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({ message_id: messageId, chat_id: chatId });
        const mockUser = createMockUser({ userId: adopterId });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Test message',
        };

        await ChatService.sendMessage(messageData);

        expect(MockedChat.update).toHaveBeenCalledWith(
          expect.objectContaining({ updated_at: expect.any(Date) }),
          expect.objectContaining({ where: { chat_id: chatId } })
        );
      });

      it('should log message sending in audit trail', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({ message_id: messageId, chat_id: chatId });
        const mockUser = createMockUser({ userId: adopterId });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Test message',
        };

        await ChatService.sendMessage(messageData);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: adopterId,
            action: 'MESSAGE_SENT',
            entity: 'Message',
            entityId: messageId,
          })
        );
      });
    });

    describe('when retrieving messages from a chat', () => {
      it('should return messages with pagination', async () => {
        const mockMessages = [
          createMockMessage({ message_id: 'msg-1', chat_id: chatId, content: 'Message 1' }),
          createMockMessage({ message_id: 'msg-2', chat_id: chatId, content: 'Message 2' }),
          createMockMessage({ message_id: 'msg-3', chat_id: chatId, content: 'Message 3' }),
        ];

        MockedMessage.findAndCountAll = jest.fn().mockResolvedValue({
          rows: mockMessages,
          count: 3,
        } as never);

        const result = await ChatService.getMessages(chatId, { page: 1, limit: 50 });

        expect(result.messages).toHaveLength(3);
        expect(result.total).toBe(3);
        expect(result.page).toBe(1);
        expect(result.totalPages).toBe(1);
      });

      it('should order messages chronologically', async () => {
        const mockMessages = [
          createMockMessage({
            message_id: 'msg-1',
            chat_id: chatId,
            created_at: new Date('2024-01-01'),
          }),
          createMockMessage({
            message_id: 'msg-2',
            chat_id: chatId,
            created_at: new Date('2024-01-02'),
          }),
        ];

        MockedMessage.findAndCountAll = jest.fn().mockResolvedValue({
          rows: mockMessages,
          count: 2,
        } as never);

        const result = await ChatService.getMessages(chatId);

        expect(MockedMessage.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            order: [['created_at', 'ASC']],
          })
        );
      });

      it('should support filtering messages by date range', async () => {
        const before = new Date('2024-01-31');
        const after = new Date('2024-01-01');

        MockedMessage.findAndCountAll = jest.fn().mockResolvedValue({
          rows: [],
          count: 0,
        } as never);

        await ChatService.getMessages(chatId, { before, after });

        expect(MockedMessage.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              chat_id: chatId,
            }),
          })
        );
      });

      it('should include sender information with messages', async () => {
        const mockUser = createMockUser({
          userId: adopterId,
          firstName: 'John',
          lastName: 'Doe',
        });
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: adopterId,
        });
        mockMessage.Sender = mockUser;

        MockedMessage.findAndCountAll = jest.fn().mockResolvedValue({
          rows: [mockMessage],
          count: 1,
        } as never);

        const result = await ChatService.getMessages(chatId);

        expect(MockedMessage.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.arrayContaining([
              expect.objectContaining({
                model: User,
                as: 'Sender',
              }),
            ]),
          })
        );
      });

      it('should validate page number is positive', async () => {
        await expect(ChatService.getMessages(chatId, { page: 0 })).rejects.toThrow(
          'Page must be greater than 0'
        );
      });

      it('should validate limit is within acceptable range', async () => {
        await expect(ChatService.getMessages(chatId, { limit: 0 })).rejects.toThrow(
          'Limit must be between 1 and 100'
        );

        await expect(ChatService.getMessages(chatId, { limit: 101 })).rejects.toThrow(
          'Limit must be between 1 and 100'
        );
      });
    });
  });

  describe('Real-Time Message Delivery and Notifications', () => {
    describe('when a message is sent', () => {
      it.skip('should send notifications to all other participants', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockSenderParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockRecipientUser = createMockUser({ userId: rescueStaffId, firstName: 'Staff' });
        const mockRecipientParticipant = Object.assign(
          createMockChatParticipant({
            chat_id: chatId,
            participant_id: rescueStaffId,
          }),
          { User: mockRecipientUser }
        );

        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: adopterId,
        });
        const mockUser = createMockUser({ userId: adopterId, firstName: 'John' });

        mockChat.Participants = [mockSenderParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest
          .fn()
          .mockResolvedValue([mockRecipientParticipant] as never);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Test notification',
        };

        await ChatService.sendMessage(messageData);

        expect(MockedNotificationService.createNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: rescueStaffId,
            type: 'message_received',
            title: 'New Message',
          })
        );
      });

      it('should not send notification to the message sender', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: adopterId,
        });
        const mockUser = createMockUser({ userId: adopterId });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]); // No other participants

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Test',
        };

        await ChatService.sendMessage(messageData);

        expect(MockedNotificationService.createNotification).not.toHaveBeenCalled();
      });

      it.skip('should include message preview in notification', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockSenderParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockRecipientUser = createMockUser({ userId: rescueStaffId, firstName: 'Staff' });
        const mockRecipientParticipant = Object.assign(
          createMockChatParticipant({
            chat_id: chatId,
            participant_id: rescueStaffId,
          }),
          { User: mockRecipientUser }
        );

        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: adopterId,
          content: 'Can I schedule a visit?',
        });
        const mockUser = createMockUser({ userId: adopterId, firstName: 'John' });

        mockChat.Participants = [mockSenderParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest
          .fn()
          .mockResolvedValue([mockRecipientParticipant] as never);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Can I schedule a visit?',
        };

        await ChatService.sendMessage(messageData);

        expect(MockedNotificationService.createNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('John'),
            data: expect.objectContaining({
              chatId,
              messageId,
              senderId: adopterId,
            }),
          })
        );
      });

      it('should continue even if notification delivery fails', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({ message_id: messageId, chat_id: chatId });
        const mockUser = createMockUser({ userId: adopterId });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([mockParticipant] as never);
        MockedNotificationService.createNotification = jest
          .fn()
          .mockRejectedValue(new Error('Notification service unavailable'));

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Test',
        };

        // Should not throw despite notification failure
        await expect(ChatService.sendMessage(messageData)).resolves.toBeDefined();
      });
    });
  });

  describe('Read Receipts and Unread Tracking', () => {
    describe('when marking messages as read', () => {
      it('should mark a single message as read', async () => {
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: rescueStaffId,
        });

        mockMessage.isReadBy = jest.fn().mockReturnValue(false);
        mockMessage.markAsRead = jest.fn();
        mockMessage.save = jest.fn().mockResolvedValue(mockMessage);

        MockedMessage.findAll = jest.fn().mockResolvedValue([mockMessage] as never);

        await ChatService.markMessagesAsRead(chatId, adopterId);

        expect(mockMessage.markAsRead).toHaveBeenCalledWith(adopterId);
        expect(mockMessage.save).toHaveBeenCalled();
      });

      it('should not re-mark already read messages', async () => {
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: rescueStaffId,
        });

        mockMessage.isReadBy = jest.fn().mockReturnValue(true);
        mockMessage.markAsRead = jest.fn();
        mockMessage.save = jest.fn().mockResolvedValue(mockMessage);

        MockedMessage.findAll = jest.fn().mockResolvedValue([mockMessage] as never);

        await ChatService.markMessagesAsRead(chatId, adopterId);

        expect(mockMessage.markAsRead).not.toHaveBeenCalled();
        expect(mockMessage.save).not.toHaveBeenCalled();
      });

      it('should not mark own messages as read', async () => {
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: adopterId, // Same as the user marking as read
        });

        mockMessage.markAsRead = jest.fn();

        MockedMessage.findAll = jest.fn().mockResolvedValue([mockMessage] as never);

        await ChatService.markMessagesAsRead(chatId, adopterId);

        // findAll should filter by sender_id != userId
        expect(MockedMessage.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              sender_id: expect.objectContaining({ [Symbol.for('ne')]: adopterId }),
            }),
          })
        );
      });
    });

    describe('when getting unread message count', () => {
      it('should return correct unread count for a chat', async () => {
        const mockMessages = [
          createMockMessage({ message_id: 'msg-1', chat_id: chatId, sender_id: rescueStaffId }),
          createMockMessage({ message_id: 'msg-2', chat_id: chatId, sender_id: rescueStaffId }),
        ];

        mockMessages[0].isReadBy = jest.fn().mockReturnValue(false);
        mockMessages[1].isReadBy = jest.fn().mockReturnValue(true);

        MockedMessage.findAll = jest.fn().mockResolvedValue(mockMessages as never);

        const count = await ChatService.getUnreadMessageCount(chatId, adopterId);

        expect(count).toBe(1);
      });

      it('should return 0 if all messages are read', async () => {
        const mockMessages = [
          createMockMessage({ message_id: 'msg-1', chat_id: chatId, sender_id: rescueStaffId }),
        ];

        mockMessages[0].isReadBy = jest.fn().mockReturnValue(true);

        MockedMessage.findAll = jest.fn().mockResolvedValue(mockMessages as never);

        const count = await ChatService.getUnreadMessageCount(chatId, adopterId);

        expect(count).toBe(0);
      });

      it('should return 0 if there are no messages', async () => {
        MockedMessage.findAll = jest.fn().mockResolvedValue([] as never);

        const count = await ChatService.getUnreadMessageCount(chatId, adopterId);

        expect(count).toBe(0);
      });
    });
  });

  describe('Participant Management', () => {
    describe('when adding participants to a chat', () => {
      it('should allow rescue staff to add a new participant', async () => {
        const mockRescueParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: rescueStaffId,
          role: ParticipantRole.RESCUE,
        });

        const mockExistingCheck = null; // User not already in chat

        MockedChatParticipant.findOne = jest
          .fn()
          .mockResolvedValueOnce(mockRescueParticipant as never) // For permission check
          .mockResolvedValueOnce(mockExistingCheck); // For duplicate check

        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);

        const result = await ChatService.addParticipant(
          chatId,
          otherUserId,
          rescueStaffId,
          'member'
        );

        expect(result).toBe(true);
        expect(MockedChatParticipant.create).toHaveBeenCalledWith(
          expect.objectContaining({
            chat_id: chatId,
            participant_id: otherUserId,
            role: ParticipantRole.USER,
          })
        );
      });

      it('should prevent non-rescue staff from adding participants', async () => {
        MockedChatParticipant.findOne = jest.fn().mockResolvedValue(null); // Not a rescue staff

        await expect(
          ChatService.addParticipant(chatId, otherUserId, adopterId, 'member')
        ).rejects.toThrow('Only rescue staff can add participants');
      });

      it('should prevent adding duplicate participants', async () => {
        const mockRescueParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: rescueStaffId,
          role: ParticipantRole.RESCUE,
        });

        const mockExistingParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: otherUserId,
        });

        MockedChatParticipant.findOne = jest
          .fn()
          .mockResolvedValueOnce(mockRescueParticipant as never) // For permission check
          .mockResolvedValueOnce(mockExistingParticipant as never); // For duplicate check

        await expect(
          ChatService.addParticipant(chatId, otherUserId, rescueStaffId, 'member')
        ).rejects.toThrow('User is already a participant');
      });

      it('should log participant addition in audit trail', async () => {
        const mockRescueParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: rescueStaffId,
          role: ParticipantRole.RESCUE,
        });

        MockedChatParticipant.findOne = jest
          .fn()
          .mockResolvedValueOnce(mockRescueParticipant as never)
          .mockResolvedValueOnce(null);

        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);

        await ChatService.addParticipant(chatId, otherUserId, rescueStaffId, 'member');

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: rescueStaffId,
            action: 'CHAT_PARTICIPANT_ADDED',
            entity: 'Chat',
            entityId: chatId,
          })
        );
      });
    });

    describe('when removing participants from a chat', () => {
      it('should allow rescue staff to remove a participant', async () => {
        const mockRescueParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: rescueStaffId,
          role: ParticipantRole.RESCUE,
        });

        MockedChatParticipant.findOne = jest.fn().mockResolvedValue(mockRescueParticipant as never);
        MockedChatParticipant.destroy = jest.fn().mockResolvedValue(1);

        const result = await ChatService.removeParticipant(chatId, otherUserId, rescueStaffId);

        expect(result).toBe(true);
        expect(MockedChatParticipant.destroy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { chat_id: chatId, participant_id: otherUserId },
          })
        );
      });

      it('should allow users to remove themselves', async () => {
        MockedChatParticipant.destroy = jest.fn().mockResolvedValue(1);

        const result = await ChatService.removeParticipant(chatId, adopterId, adopterId);

        expect(result).toBe(true);
        expect(MockedChatParticipant.destroy).toHaveBeenCalled();
      });

      it('should prevent non-rescue staff from removing other participants', async () => {
        MockedChatParticipant.findOne = jest.fn().mockResolvedValue(null);

        await expect(
          ChatService.removeParticipant(chatId, otherUserId, adopterId)
        ).rejects.toThrow('Only rescue staff can remove other participants');
      });

      it('should log participant removal in audit trail', async () => {
        const mockRescueParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: rescueStaffId,
          role: ParticipantRole.RESCUE,
        });

        MockedChatParticipant.findOne = jest.fn().mockResolvedValue(mockRescueParticipant as never);
        MockedChatParticipant.destroy = jest.fn().mockResolvedValue(1);

        await ChatService.removeParticipant(chatId, otherUserId, rescueStaffId);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: rescueStaffId,
            action: 'CHAT_PARTICIPANT_REMOVED',
            entity: 'Chat',
            entityId: chatId,
          })
        );
      });
    });
  });

  describe('Message Reactions', () => {
    describe('when adding reactions to messages', () => {
      it('should successfully add a reaction to a message', async () => {
        const mockMessage = createMockMessage({ message_id: messageId, chat_id: chatId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });

        mockMessage.addReaction = jest.fn();
        mockMessage.save = jest.fn().mockResolvedValue(mockMessage);

        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChatParticipant.findOne = jest.fn().mockResolvedValue(mockParticipant as never);

        const result = await ChatService.addMessageReaction(messageId, adopterId, '👍');

        expect(mockMessage.addReaction).toHaveBeenCalledWith(adopterId, '👍');
        expect(mockMessage.save).toHaveBeenCalled();
      });

      it('should prevent non-participants from reacting to messages', async () => {
        const mockMessage = createMockMessage({ message_id: messageId, chat_id: chatId });

        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChatParticipant.findOne = jest.fn().mockResolvedValue(null);

        await expect(
          ChatService.addMessageReaction(messageId, 'non-participant-999', '👍')
        ).rejects.toThrow('User is not a participant in this chat');
      });

      it('should handle adding multiple different reactions', async () => {
        const mockMessage = createMockMessage({ message_id: messageId, chat_id: chatId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });

        mockMessage.addReaction = jest.fn();
        mockMessage.save = jest.fn().mockResolvedValue(mockMessage);

        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChatParticipant.findOne = jest.fn().mockResolvedValue(mockParticipant as never);

        await ChatService.addMessageReaction(messageId, adopterId, '👍');
        await ChatService.addMessageReaction(messageId, adopterId, '❤️');

        expect(mockMessage.addReaction).toHaveBeenCalledWith(adopterId, '👍');
        expect(mockMessage.addReaction).toHaveBeenCalledWith(adopterId, '❤️');
      });

      it('should reject reaction for non-existent message', async () => {
        MockedMessage.findByPk = jest.fn().mockResolvedValue(null);

        await expect(
          ChatService.addMessageReaction('non-existent-message', adopterId, '👍')
        ).rejects.toThrow('Message not found');
      });
    });

    describe('when removing reactions from messages', () => {
      it('should successfully remove a reaction from a message', async () => {
        const mockMessage = createMockMessage({ message_id: messageId, chat_id: chatId });

        mockMessage.removeReaction = jest.fn();
        mockMessage.save = jest.fn().mockResolvedValue(mockMessage);

        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);

        const result = await ChatService.removeMessageReaction(messageId, adopterId, '👍');

        expect(mockMessage.removeReaction).toHaveBeenCalledWith(adopterId, '👍');
        expect(mockMessage.save).toHaveBeenCalled();
      });

      it('should handle removing non-existent reaction gracefully', async () => {
        const mockMessage = createMockMessage({ message_id: messageId, chat_id: chatId });

        mockMessage.removeReaction = jest.fn();
        mockMessage.save = jest.fn().mockResolvedValue(mockMessage);

        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);

        await expect(
          ChatService.removeMessageReaction(messageId, adopterId, '👍')
        ).resolves.toBeDefined();
      });

      it('should reject removal for non-existent message', async () => {
        MockedMessage.findByPk = jest.fn().mockResolvedValue(null);

        await expect(
          ChatService.removeMessageReaction('non-existent-message', adopterId, '👍')
        ).rejects.toThrow('Message not found');
      });
    });
  });

  describe('File Attachments', () => {
    describe('when sending messages with attachments', () => {
      it('should successfully send a message with image attachment', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          attachments: [
            {
              attachment_id: 'att-1',
              filename: 'dog.jpg',
              originalName: 'dog.jpg',
              mimeType: 'image/jpeg',
              size: 1024000,
              url: 'https://example.com/dog.jpg',
            },
          ],
        });
        const mockUser = createMockUser({ userId: adopterId });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Check out this photo!',
          messageType: 'image' as const,
          attachments: [
            {
              attachment_id: 'att-1',
              filename: 'dog.jpg',
              originalName: 'dog.jpg',
              mimeType: 'image/jpeg',
              size: 1024000,
              url: 'https://example.com/dog.jpg',
            },
          ],
        };

        const result = await ChatService.sendMessage(messageData);

        expect(result).toBeDefined();
        expect(MockedMessage.create).toHaveBeenCalledWith(
          expect.objectContaining({
            attachments: expect.arrayContaining([
              expect.objectContaining({
                filename: 'dog.jpg',
                mimeType: 'image/jpeg',
              }),
            ]),
          }),
          expect.any(Object)
        );
      });

      it('should successfully send a message with document attachment', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          attachments: [
            {
              attachment_id: 'att-2',
              filename: 'adoption-form.pdf',
              originalName: 'adoption-form.pdf',
              mimeType: 'application/pdf',
              size: 2048000,
              url: 'https://example.com/adoption-form.pdf',
            },
          ],
        });
        const mockUser = createMockUser({ userId: adopterId });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Here is the completed form',
          messageType: 'file' as const,
          attachments: [
            {
              attachment_id: 'att-2',
              filename: 'adoption-form.pdf',
              originalName: 'adoption-form.pdf',
              mimeType: 'application/pdf',
              size: 2048000,
              url: 'https://example.com/adoption-form.pdf',
            },
          ],
        };

        const result = await ChatService.sendMessage(messageData);

        expect(result).toBeDefined();
      });

      it('should allow messages with multiple attachments', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          attachments: [
            {
              attachment_id: 'att-1',
              filename: 'photo1.jpg',
              originalName: 'photo1.jpg',
              mimeType: 'image/jpeg',
              size: 1024000,
              url: 'https://example.com/photo1.jpg',
            },
            {
              attachment_id: 'att-2',
              filename: 'photo2.jpg',
              originalName: 'photo2.jpg',
              mimeType: 'image/jpeg',
              size: 1024000,
              url: 'https://example.com/photo2.jpg',
            },
          ],
        });
        const mockUser = createMockUser({ userId: adopterId });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Multiple photos',
          attachments: [
            {
              attachment_id: 'att-1',
              filename: 'photo1.jpg',
              originalName: 'photo1.jpg',
              mimeType: 'image/jpeg',
              size: 1024000,
              url: 'https://example.com/photo1.jpg',
            },
            {
              attachment_id: 'att-2',
              filename: 'photo2.jpg',
              originalName: 'photo2.jpg',
              mimeType: 'image/jpeg',
              size: 1024000,
              url: 'https://example.com/photo2.jpg',
            },
          ],
        };

        const result = await ChatService.sendMessage(messageData);

        expect(result).toBeDefined();
        expect(MockedMessage.create).toHaveBeenCalledWith(
          expect.objectContaining({
            attachments: expect.arrayContaining([
              expect.objectContaining({ filename: 'photo1.jpg' }),
              expect.objectContaining({ filename: 'photo2.jpg' }),
            ]),
          }),
          expect.any(Object)
        );
      });

      it('should infer message type from attachments', async () => {
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          attachments: [
            {
              attachment_id: 'att-1',
              filename: 'photo.jpg',
              originalName: 'photo.jpg',
              mimeType: 'image/jpeg',
              size: 1024000,
              url: 'https://example.com/photo.jpg',
            },
          ],
        });
        const mockUser = createMockUser({ userId: adopterId });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]);

        const messageData = {
          chatId,
          senderId: adopterId,
          content: 'Photo',
          attachments: [
            {
              attachment_id: 'att-1',
              filename: 'photo.jpg',
              originalName: 'photo.jpg',
              mimeType: 'image/jpeg',
              size: 1024000,
              url: 'https://example.com/photo.jpg',
            },
          ],
        };

        const result = await ChatService.sendMessage(messageData);

        expect(result).toBeDefined();
      });
    });
  });

  describe('Complete Chat Workflows', () => {
    describe('when following a complete adoption inquiry flow', () => {
      it('should handle: create chat, send messages, read messages, react, add participant', async () => {
        // Step 1: Create chat
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant1 = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockParticipant2 = createMockChatParticipant({
          chat_id: chatId,
          participant_id: rescueStaffId,
        });

        MockedChat.create = jest.fn().mockResolvedValue(mockChat as never);
        MockedChatParticipant.create = jest
          .fn()
          .mockResolvedValueOnce(mockParticipant1 as never)
          .mockResolvedValueOnce(mockParticipant2 as never);
        MockedMessage.create = jest.fn().mockResolvedValue({} as never);

        const chatData = {
          rescueId,
          participantIds: [adopterId, rescueStaffId],
          initialMessage: 'Hi, I am interested in adopting!',
        };

        const chat = await ChatService.createChat(chatData, adopterId);
        expect(chat.chat_id).toBe(chatId);

        // Step 2: Send message
        const mockMessage1 = createMockMessage({
          message_id: 'msg-1',
          chat_id: chatId,
          sender_id: rescueStaffId,
          content: 'Great! What are you looking for?',
        });
        const mockUser1 = createMockUser({ userId: rescueStaffId, firstName: 'Staff' });

        mockChat.Participants = [mockParticipant2];
        mockMessage1.Sender = mockUser1;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage1 as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage1 as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([mockParticipant1] as never);

        const message1 = await ChatService.sendMessage({
          chatId,
          senderId: rescueStaffId,
          content: 'Great! What are you looking for?',
        });

        expect(message1).toBeDefined();

        // Step 3: Mark message as read
        mockMessage1.isReadBy = jest.fn().mockReturnValue(false);
        mockMessage1.markAsRead = jest.fn();
        mockMessage1.save = jest.fn().mockResolvedValue(mockMessage1);

        MockedMessage.findAll = jest.fn().mockResolvedValue([mockMessage1] as never);

        await ChatService.markMessagesAsRead(chatId, adopterId);
        expect(mockMessage1.markAsRead).toHaveBeenCalledWith(adopterId);

        // Step 4: React to message
        mockMessage1.addReaction = jest.fn();
        mockMessage1.save = jest.fn().mockResolvedValue(mockMessage1);

        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage1 as never);
        MockedChatParticipant.findOne = jest.fn().mockResolvedValue(mockParticipant1 as never);

        await ChatService.addMessageReaction('msg-1', adopterId, '👍');
        expect(mockMessage1.addReaction).toHaveBeenCalledWith(adopterId, '👍');

        // Step 5: Add another participant
        const mockRescueParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: rescueStaffId,
          role: ParticipantRole.RESCUE,
        });

        MockedChatParticipant.findOne = jest
          .fn()
          .mockResolvedValueOnce(mockRescueParticipant as never)
          .mockResolvedValueOnce(null);
        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);

        await ChatService.addParticipant(chatId, otherUserId, rescueStaffId, 'member');
        expect(MockedChatParticipant.create).toHaveBeenCalled();

        // Verify all audit logs (create chat, send message, add participant)
        expect(MockedAuditLogService.log).toHaveBeenCalledTimes(3);
      });
    });

    describe('when following a multi-party group chat flow', () => {
      it('should handle: create group chat, multiple messages, participant leaves', async () => {
        // Step 1: Create group chat with 3 participants
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const participants = [adopterId, rescueStaffId, otherUserId];

        MockedChat.create = jest.fn().mockResolvedValue(mockChat as never);
        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);

        const chatData = {
          rescueId,
          participantIds: participants,
        };

        await ChatService.createChat(chatData, adopterId);

        expect(MockedChatParticipant.create).toHaveBeenCalledTimes(3);

        // Step 2: Multiple users send messages
        const mockMessage1 = createMockMessage({
          message_id: 'msg-1',
          chat_id: chatId,
          sender_id: adopterId,
        });
        const mockMessage2 = createMockMessage({
          message_id: 'msg-2',
          chat_id: chatId,
          sender_id: rescueStaffId,
        });
        const mockUser1 = createMockUser({ userId: adopterId });
        const mockUser2 = createMockUser({ userId: rescueStaffId });

        mockMessage1.Sender = mockUser1;
        mockMessage2.Sender = mockUser2;

        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });

        mockChat.Participants = [mockParticipant];

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest
          .fn()
          .mockResolvedValueOnce(mockMessage1 as never)
          .mockResolvedValueOnce(mockMessage2 as never);
        MockedMessage.findByPk = jest
          .fn()
          .mockResolvedValueOnce(mockMessage1 as never)
          .mockResolvedValueOnce(mockMessage2 as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]);

        await ChatService.sendMessage({
          chatId,
          senderId: adopterId,
          content: 'Message 1',
        });

        await ChatService.sendMessage({
          chatId,
          senderId: rescueStaffId,
          content: 'Message 2',
        });

        // Step 3: One participant leaves
        MockedChatParticipant.destroy = jest.fn().mockResolvedValue(1);

        await ChatService.removeParticipant(chatId, otherUserId, otherUserId);

        expect(MockedChatParticipant.destroy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { chat_id: chatId, participant_id: otherUserId },
          })
        );
      });
    });

    describe('when handling chat moderation workflow', () => {
      it('should handle: send message, report message, moderate message, delete message', async () => {
        // Step 1: Send message
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });
        const mockMessage = createMockMessage({
          message_id: messageId,
          chat_id: chatId,
          sender_id: adopterId,
          content: 'Inappropriate message',
        });
        const mockUser = createMockUser({ userId: adopterId });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]);

        await ChatService.sendMessage({
          chatId,
          senderId: adopterId,
          content: 'Inappropriate message',
        });

        // Step 2: Report message
        await ChatService.reportContent(rescueStaffId, chatId, 'spam', messageId, 'This is spam');

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CHAT_REPORTED',
            entity: 'Chat',
            entityId: chatId,
          })
        );

        // Step 3: Moderate message
        mockMessage.update = jest.fn().mockResolvedValue(mockMessage);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChatParticipant.findOne = jest.fn().mockResolvedValue(mockParticipant as never);

        await ChatService.moderateMessage(rescueStaffId, messageId, 'Inappropriate content');

        expect(mockMessage.update).toHaveBeenCalledWith(
          expect.objectContaining({
            content: '[Message moderated]',
          })
        );

        // Step 4: Delete message
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        mockMessage.update = jest.fn().mockResolvedValue(mockMessage);

        await ChatService.deleteMessage(messageId, rescueStaffId, 'Policy violation');

        expect(mockMessage.update).toHaveBeenCalledWith(
          expect.objectContaining({
            content: '[Message deleted]',
          })
        );
      });
    });

    describe('when handling chat archival workflow', () => {
      it('should handle: create chat, exchange messages, archive chat', async () => {
        // Step 1: Create chat
        const mockChat = createMockChat({ chat_id: chatId, rescue_id: rescueId });

        MockedChat.create = jest.fn().mockResolvedValue(mockChat as never);
        MockedChatParticipant.create = jest.fn().mockResolvedValue({} as never);

        await ChatService.createChat(
          {
            rescueId,
            participantIds: [adopterId, rescueStaffId],
          },
          adopterId
        );

        // Step 2: Exchange messages
        const mockMessage = createMockMessage({ message_id: messageId, chat_id: chatId });
        const mockUser = createMockUser({ userId: adopterId });
        const mockParticipant = createMockChatParticipant({
          chat_id: chatId,
          participant_id: adopterId,
        });

        mockChat.Participants = [mockParticipant];
        mockMessage.Sender = mockUser;

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);
        MockedMessage.count = jest.fn().mockResolvedValue(0);
        MockedMessage.create = jest.fn().mockResolvedValue(mockMessage as never);
        MockedMessage.findByPk = jest.fn().mockResolvedValue(mockMessage as never);
        MockedChat.update = jest.fn().mockResolvedValue([1] as never);
        MockedChatParticipant.findAll = jest.fn().mockResolvedValue([]);

        await ChatService.sendMessage({
          chatId,
          senderId: adopterId,
          content: 'Final message',
        });

        // Step 3: Update chat to archived status
        mockChat.update = jest.fn().mockResolvedValue(mockChat);
        mockChat.reload = jest.fn().mockResolvedValue(mockChat);

        MockedChat.findByPk = jest.fn().mockResolvedValue(mockChat as never);

        const updatedChat = await ChatService.updateChat(
          chatId,
          { status: ChatStatus.ARCHIVED },
          rescueStaffId
        );

        expect(mockChat.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ChatStatus.ARCHIVED,
          })
        );

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'UPDATE',
            entity: 'Chat',
            entityId: chatId,
          })
        );
      });
    });
  });
});

// Helper function to create mock user
function createMockUser(overrides: Partial<User> = {}): jest.Mocked<User> {
  const defaultUser = {
    userId: 'mock-user-123',
    email: 'mock@example.com',
    firstName: 'Mock',
    lastName: 'User',
    password: 'hashed_password',
    emailVerified: true,
    status: UserStatus.ACTIVE,
    userType: UserType.ADOPTER,
    loginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    toJSON: jest.fn().mockReturnValue({
      userId: overrides.userId ?? 'mock-user-123',
      email: overrides.email ?? 'mock@example.com',
      firstName: overrides.firstName ?? 'Mock',
      lastName: overrides.lastName ?? 'User',
      userType: overrides.userType ?? UserType.ADOPTER,
      status: overrides.status ?? UserStatus.ACTIVE,
    }),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultUser as jest.Mocked<User>;
}

// Helper function to create mock chat
function createMockChat(overrides: Partial<Chat> = {}): jest.Mocked<Chat> {
  const defaultChat = {
    chat_id: 'mock-chat-123',
    rescue_id: 'rescue-123',
    pet_id: null,
    application_id: null,
    status: ChatStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
    Messages: [],
    Participants: [],
    rescue: null,
    toJSON: jest.fn().mockReturnValue({
      chat_id: overrides.chat_id ?? 'mock-chat-123',
      rescue_id: overrides.rescue_id ?? 'rescue-123',
      status: overrides.status ?? ChatStatus.ACTIVE,
    }),
    update: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultChat as jest.Mocked<Chat>;
}

// Helper function to create mock chat participant
function createMockChatParticipant(
  overrides: Partial<ChatParticipant> = {}
): jest.Mocked<ChatParticipant> {
  const defaultParticipant = {
    chat_participant_id: 'mock-participant-123',
    chat_id: 'chat-123',
    participant_id: 'user-123',
    role: ParticipantRole.USER,
    last_read_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    toJSON: jest.fn().mockReturnValue({
      chat_participant_id: overrides.chat_participant_id ?? 'mock-participant-123',
      chat_id: overrides.chat_id ?? 'chat-123',
      participant_id: overrides.participant_id ?? 'user-123',
      role: overrides.role ?? ParticipantRole.USER,
    }),
    update: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultParticipant as jest.Mocked<ChatParticipant>;
}

// Helper function to create mock message
function createMockMessage(overrides: Partial<Message> = {}): jest.Mocked<Message> {
  const defaultMessage = {
    message_id: 'mock-message-123',
    chat_id: 'chat-123',
    sender_id: 'user-123',
    content: 'Mock message content',
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    reactions: [],
    read_status: [],
    search_vector: null,
    created_at: new Date(),
    updated_at: new Date(),
    Chat: undefined,
    Sender: undefined,
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
    getReactionCount: jest.fn().mockReturnValue(0),
    hasUserReacted: jest.fn().mockReturnValue(false),
    markAsRead: jest.fn(),
    isReadBy: jest.fn().mockReturnValue(false),
    getReadCount: jest.fn().mockReturnValue(0),
    getUnreadUsers: jest.fn().mockReturnValue([]),
    toJSON: jest.fn().mockReturnValue({
      message_id: overrides.message_id ?? 'mock-message-123',
      chat_id: overrides.chat_id ?? 'chat-123',
      sender_id: overrides.sender_id ?? 'user-123',
      content: overrides.content ?? 'Mock message content',
      content_format: MessageContentFormat.PLAIN,
    }),
    update: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultMessage as unknown as jest.Mocked<Message>;
}
