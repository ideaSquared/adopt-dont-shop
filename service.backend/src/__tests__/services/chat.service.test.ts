import { vi } from 'vitest';
// Mock models at the models/index level
vi.mock('../../models', () => ({
  Chat: {
    create: vi.fn(),
    findByPk: vi.fn(),
    findAndCountAll: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
  },
  ChatParticipant: {
    create: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    destroy: vi.fn(),
  },
  Message: {
    create: vi.fn(),
    findByPk: vi.fn(),
    findAll: vi.fn(),
    findAndCountAll: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  User: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
  },
}));

// Mock NotificationType and NotificationPriority
vi.mock('../../models/Notification', () => ({
  NotificationType: {
    MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  },
  NotificationPriority: {
    NORMAL: 'NORMAL',
  },
}));

// Mock the static log method
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock notification service
vi.mock('../../services/notification.service', () => ({
  NotificationService: {
    createNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
  },
}));

// Mock sequelize
vi.mock('../../sequelize', () => {
  const mockTransaction = {
    commit: vi.fn(),
    rollback: vi.fn(),
  };

  return {
    __esModule: true,
    default: {
      transaction: vi.fn().mockResolvedValue(mockTransaction),
    },
  };
});

import { Op } from 'sequelize';
import { Chat, ChatParticipant, Message, User } from '../../models';
import { ChatService } from '../../services/chat.service';
import { ChatStatus, ParticipantRole, MessageContentFormat } from '../../types/chat';
import { AuditLogService } from '../../services/auditLog.service';
import { NotificationService } from '../../services/notification.service';

const MockedChat = Chat as vi.Mocked<typeof Chat>;
const MockedChatParticipant = ChatParticipant as vi.Mocked<typeof ChatParticipant>;
const MockedMessage = Message as vi.Mocked<typeof Message>;
const MockedUser = User as vi.Mocked<typeof User>;
const mockAuditLogAction = AuditLogService.log as vi.MockedFunction<typeof AuditLogService.log>;
const mockCreateNotification = NotificationService.createNotification as vi.MockedFunction<
  typeof NotificationService.createNotification
>;

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Creating chats', () => {
    describe('when creating a direct chat between user and rescue', () => {
      it('should create a chat with two participants and set correct roles', async () => {
        const userId = 'user-123';
        const rescueId = 'rescue-456';
        const chatData = {
          rescueId,
          participantIds: [userId, rescueId],
        };

        const mockChat = {
          chat_id: 'chat-789',
          rescue_id: rescueId,
          status: ChatStatus.ACTIVE,
          created_at: new Date(),
          updated_at: new Date(),
        };

        (MockedChat.create as vi.Mock).mockResolvedValue(mockChat);
        (MockedChatParticipant.create as vi.Mock).mockResolvedValue({
          chat_id: mockChat.chat_id,
          participant_id: userId,
          role: ParticipantRole.USER,
        });

        const result = await ChatService.createChat(chatData, userId);

        expect(MockedChat.create).toHaveBeenCalledWith({
          rescue_id: rescueId,
          application_id: undefined,
          pet_id: undefined,
          status: ChatStatus.ACTIVE,
        });

        // Verify both participants are added
        expect(MockedChatParticipant.create).toHaveBeenCalledTimes(2);

        // Verify the user creator gets USER role
        expect(MockedChatParticipant.create).toHaveBeenCalledWith(
          expect.objectContaining({
            chat_id: mockChat.chat_id,
            participant_id: userId,
            role: ParticipantRole.USER,
          })
        );

        // Verify the other participant gets RESCUE role
        expect(MockedChatParticipant.create).toHaveBeenCalledWith(
          expect.objectContaining({
            chat_id: mockChat.chat_id,
            participant_id: rescueId,
            role: ParticipantRole.RESCUE,
          })
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CREATE',
            entity: 'Chat',
            entityId: mockChat.chat_id,
            userId,
          })
        );

        expect(result).toEqual(mockChat);
      });
    });

    describe('when creating a chat with an initial message', () => {
      it('should create the chat and send the initial message', async () => {
        const userId = 'user-123';
        const rescueId = 'rescue-456';
        const initialMessage = 'Hello, I am interested in adopting!';
        const chatData = {
          rescueId,
          participantIds: [userId, rescueId],
          initialMessage,
        };

        const mockChat = {
          chat_id: 'chat-789',
          rescue_id: rescueId,
          status: ChatStatus.ACTIVE,
          created_at: new Date(),
          updated_at: new Date(),
        };

        (MockedChat.create as vi.Mock).mockResolvedValue(mockChat);
        (MockedChatParticipant.create as vi.Mock).mockResolvedValue({});
        (MockedMessage.create as vi.Mock).mockResolvedValue({
          message_id: 'message-001',
          chat_id: mockChat.chat_id,
          sender_id: userId,
          content: initialMessage,
        });

        await ChatService.createChat(chatData, userId);

        expect(MockedMessage.create).toHaveBeenCalledWith({
          chat_id: mockChat.chat_id,
          sender_id: userId,
          content: initialMessage,
          content_format: MessageContentFormat.PLAIN,
        });
      });
    });

    describe('when creating an application-specific chat', () => {
      it('should create a chat linked to the application', async () => {
        const userId = 'user-123';
        const rescueId = 'rescue-456';
        const applicationId = 'app-789';
        const petId = 'pet-101';
        const chatData = {
          rescueId,
          applicationId,
          petId,
          participantIds: [userId, rescueId],
        };

        const mockChat = {
          chat_id: 'chat-999',
          rescue_id: rescueId,
          application_id: applicationId,
          pet_id: petId,
          status: ChatStatus.ACTIVE,
        };

        (MockedChat.create as vi.Mock).mockResolvedValue(mockChat);
        (MockedChatParticipant.create as vi.Mock).mockResolvedValue({});

        const result = await ChatService.createChat(chatData, userId);

        expect(MockedChat.create).toHaveBeenCalledWith({
          rescue_id: rescueId,
          application_id: applicationId,
          pet_id: petId,
          status: ChatStatus.ACTIVE,
        });

        expect(result.application_id).toBe(applicationId);
        expect(result.pet_id).toBe(petId);
      });
    });

    describe('when creating a chat with empty participant IDs', () => {
      it('should filter out empty participant IDs', async () => {
        const userId = 'user-123';
        const rescueId = 'rescue-456';
        const chatData = {
          rescueId,
          participantIds: [userId, '', '  ', rescueId],
        };

        const mockChat = {
          chat_id: 'chat-789',
          rescue_id: rescueId,
          status: ChatStatus.ACTIVE,
        };

        (MockedChat.create as vi.Mock).mockResolvedValue(mockChat);
        (MockedChatParticipant.create as vi.Mock).mockResolvedValue({});

        await ChatService.createChat(chatData, userId);

        // Should only create participants for non-empty IDs
        expect(MockedChatParticipant.create).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Sending messages', () => {
    describe('when sending a message successfully', () => {
      it('should create the message and send notifications', async () => {
        const chatId = 'chat-123';
        const senderId = 'user-456';
        const rescueId = 'rescue-789';
        const content = 'Hello, I would like to adopt this pet';

        const mockChat = {
          chat_id: chatId,
          rescue_id: rescueId,
          status: ChatStatus.ACTIVE,
        };

        const mockMessage = {
          message_id: 'msg-001',
          chat_id: chatId,
          sender_id: senderId,
          content,
          created_at: new Date(),
          Sender: {
            userId: senderId,
            firstName: 'John',
            lastName: 'Doe',
          },
        };

        const mockParticipants = [
          {
            participant_id: rescueId,
            chat_id: chatId,
            User: {
              userId: rescueId,
              firstName: 'Rescue',
              lastName: 'Organization',
            },
          },
        ];

        // Mock for findByPk with includes (for checking chat and participants)
        (MockedChat.findByPk as vi.Mock).mockResolvedValue({
          ...mockChat,
          Participants: [{ participant_id: senderId }],
        });

        // Mock for checking rate limit
        (MockedMessage.count as vi.Mock).mockResolvedValue(0);

        // Mock for creating the message
        (MockedMessage.create as vi.Mock).mockResolvedValue(mockMessage);

        // Mock for loading message with sender after creation
        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(mockMessage);

        // Mock for updating chat last activity
        (MockedChat.update as vi.Mock).mockResolvedValue([1]);

        // Mock for finding participants to notify (excluding sender)
        (MockedChatParticipant.findAll as vi.Mock).mockResolvedValue(mockParticipants);

        await ChatService.sendMessage({
          chatId,
          senderId,
          content,
        });

        expect(MockedMessage.create).toHaveBeenCalledWith(
          expect.objectContaining({
            chat_id: chatId,
            sender_id: senderId,
            content,
          }),
          expect.any(Object) // transaction
        );

        expect(mockCreateNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: rescueId,
            type: 'MESSAGE_RECEIVED',
            title: 'New Message',
            message: expect.stringContaining('John'),
          })
        );
      });
    });

    describe('when rate limit is exceeded', () => {
      it('should throw an error when user sends too many messages', async () => {
        const chatId = 'chat-123';
        const senderId = 'user-456';

        const mockChat = {
          chat_id: chatId,
          rescue_id: 'rescue-789',
          status: ChatStatus.ACTIVE,
        };

        (MockedChat.findByPk as vi.Mock).mockResolvedValue(mockChat);
        // Mock 10 recent messages (at the rate limit)
        (MockedMessage.count as vi.Mock).mockResolvedValue(10);

        await expect(
          ChatService.sendMessage({
            chatId,
            senderId,
            content: 'This should fail',
          })
        ).rejects.toThrow('Rate limit exceeded');

        expect(MockedMessage.create).not.toHaveBeenCalled();
      });
    });

    describe('when user is not a participant', () => {
      it('should throw an error', async () => {
        const chatId = 'chat-123';
        const senderId = 'user-456';

        // Mock no chat found (user is not a participant)
        (MockedChat.findByPk as vi.Mock).mockResolvedValue(null);

        await expect(
          ChatService.sendMessage({
            chatId,
            senderId,
            content: 'This should fail',
          })
        ).rejects.toThrow('Chat not found or user is not a participant');

        expect(MockedMessage.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Read receipts and unread counts', () => {
    describe('when marking messages as read', () => {
      it('should mark all unread messages in a chat as read for the user', async () => {
        const chatId = 'chat-123';
        const userId = 'user-456';

        const mockMessages = [
          {
            message_id: 'msg-001',
            chat_id: chatId,
            sender_id: 'other-user',
            content: 'Message 1',
            isReadBy: vi.fn().mockReturnValue(false),
            markAsRead: vi.fn(),
            save: vi.fn().mockResolvedValue(undefined),
          },
          {
            message_id: 'msg-002',
            chat_id: chatId,
            sender_id: 'other-user',
            content: 'Message 2',
            isReadBy: vi.fn().mockReturnValue(false),
            markAsRead: vi.fn(),
            save: vi.fn().mockResolvedValue(undefined),
          },
        ];

        (MockedMessage.findAll as vi.Mock).mockResolvedValue(mockMessages);

        const result = await ChatService.markMessagesAsRead(chatId, userId);

        expect(MockedMessage.findAll).toHaveBeenCalledWith({
          where: {
            chat_id: chatId,
            sender_id: { [Op.ne]: userId },
          },
        });

        expect(mockMessages[0].markAsRead).toHaveBeenCalledWith(userId);
        expect(mockMessages[0].save).toHaveBeenCalled();
        expect(mockMessages[1].markAsRead).toHaveBeenCalledWith(userId);
        expect(mockMessages[1].save).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should not mark already-read messages again', async () => {
        const chatId = 'chat-123';
        const userId = 'user-456';

        const mockMessages = [
          {
            message_id: 'msg-001',
            chat_id: chatId,
            sender_id: 'other-user',
            isReadBy: vi.fn().mockReturnValue(true), // Already read
            markAsRead: vi.fn(),
            save: vi.fn(),
          },
          {
            message_id: 'msg-002',
            chat_id: chatId,
            sender_id: 'other-user',
            isReadBy: vi.fn().mockReturnValue(false), // Unread
            markAsRead: vi.fn(),
            save: vi.fn().mockResolvedValue(undefined),
          },
        ];

        (MockedMessage.findAll as vi.Mock).mockResolvedValue(mockMessages);

        await ChatService.markMessagesAsRead(chatId, userId);

        // First message should not be marked (already read)
        expect(mockMessages[0].markAsRead).not.toHaveBeenCalled();
        expect(mockMessages[0].save).not.toHaveBeenCalled();

        // Second message should be marked
        expect(mockMessages[1].markAsRead).toHaveBeenCalledWith(userId);
        expect(mockMessages[1].save).toHaveBeenCalled();
      });
    });

    describe('when getting unread message count', () => {
      it('should return the count of unread messages for a user', async () => {
        const chatId = 'chat-123';
        const userId = 'user-456';

        const mockMessages = [
          {
            message_id: 'msg-001',
            sender_id: 'other-user',
            isReadBy: vi.fn().mockReturnValue(false),
          },
          {
            message_id: 'msg-002',
            sender_id: 'other-user',
            isReadBy: vi.fn().mockReturnValue(false),
          },
          {
            message_id: 'msg-003',
            sender_id: 'other-user',
            isReadBy: vi.fn().mockReturnValue(true),
          },
        ];

        (MockedMessage.findAll as vi.Mock).mockResolvedValue(mockMessages);

        const count = await ChatService.getUnreadMessageCount(chatId, userId);

        expect(count).toBe(2);
        expect(MockedMessage.findAll).toHaveBeenCalledWith({
          where: {
            chat_id: chatId,
            sender_id: { [Op.ne]: userId },
          },
        });
      });

      it('should return zero when all messages are read', async () => {
        const chatId = 'chat-123';
        const userId = 'user-456';

        const mockMessages = [
          {
            message_id: 'msg-001',
            sender_id: 'other-user',
            isReadBy: vi.fn().mockReturnValue(true),
          },
        ];

        (MockedMessage.findAll as vi.Mock).mockResolvedValue(mockMessages);

        const count = await ChatService.getUnreadMessageCount(chatId, userId);

        expect(count).toBe(0);
      });
    });
  });

  describe('Participant management', () => {
    describe('when adding a participant', () => {
      it('should allow rescue staff to add a new participant', async () => {
        const chatId = 'chat-123';
        const userId = 'new-user-456';
        const addedBy = 'rescue-staff-789';

        const mockAdder = {
          chat_id: chatId,
          participant_id: addedBy,
          role: 'rescue',
        };

        (MockedChatParticipant.findOne as vi.Mock)
          .mockResolvedValueOnce(mockAdder) // Verify adder has rescue role
          .mockResolvedValueOnce(null); // Verify user is not already participant

        (MockedChatParticipant.create as vi.Mock).mockResolvedValue({
          chat_id: chatId,
          participant_id: userId,
          role: ParticipantRole.USER,
        });

        const result = await ChatService.addParticipant(chatId, userId, addedBy);

        expect(result).toBe(true);
        expect(MockedChatParticipant.create).toHaveBeenCalledWith({
          chat_id: chatId,
          participant_id: userId,
          role: ParticipantRole.USER,
        });

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CHAT_PARTICIPANT_ADDED',
            entity: 'Chat',
            entityId: chatId,
          })
        );
      });

      it('should reject when non-rescue user tries to add participant', async () => {
        const chatId = 'chat-123';
        const userId = 'new-user-456';
        const addedBy = 'regular-user-789';

        // Mock returns null (user is not rescue staff)
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(null);

        await expect(ChatService.addParticipant(chatId, userId, addedBy)).rejects.toThrow(
          'Only rescue staff can add participants'
        );

        expect(MockedChatParticipant.create).not.toHaveBeenCalled();
      });

      it('should reject when user is already a participant', async () => {
        const chatId = 'chat-123';
        const userId = 'existing-user-456';
        const addedBy = 'rescue-staff-789';

        const mockAdder = {
          participant_id: addedBy,
          role: 'rescue',
        };

        const mockExisting = {
          participant_id: userId,
        };

        (MockedChatParticipant.findOne as vi.Mock)
          .mockResolvedValueOnce(mockAdder)
          .mockResolvedValueOnce(mockExisting); // User already exists

        await expect(ChatService.addParticipant(chatId, userId, addedBy)).rejects.toThrow(
          'User is already a participant'
        );

        expect(MockedChatParticipant.create).not.toHaveBeenCalled();
      });
    });

    describe('when removing a participant', () => {
      it('should allow rescue staff to remove a participant', async () => {
        const chatId = 'chat-123';
        const userId = 'user-to-remove-456';
        const removedBy = 'rescue-staff-789';

        const mockRemover = {
          chat_id: chatId,
          participant_id: removedBy,
          role: 'rescue',
        };

        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(mockRemover);
        (MockedChatParticipant.destroy as vi.Mock).mockResolvedValue(1);

        const result = await ChatService.removeParticipant(chatId, userId, removedBy);

        expect(result).toBe(true);
        expect(MockedChatParticipant.destroy).toHaveBeenCalledWith({
          where: { chat_id: chatId, participant_id: userId },
        });

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CHAT_PARTICIPANT_REMOVED',
            entity: 'Chat',
            entityId: chatId,
          })
        );
      });

      it('should allow users to remove themselves', async () => {
        const chatId = 'chat-123';
        const userId = 'user-456';

        (MockedChatParticipant.destroy as vi.Mock).mockResolvedValue(1);

        const result = await ChatService.removeParticipant(chatId, userId, userId);

        expect(result).toBe(true);
        expect(MockedChatParticipant.destroy).toHaveBeenCalledWith({
          where: { chat_id: chatId, participant_id: userId },
        });
      });

      it('should reject when non-rescue user tries to remove another user', async () => {
        const chatId = 'chat-123';
        const userId = 'victim-456';
        const removedBy = 'regular-user-789';

        // Mock returns null (remover is not rescue staff)
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(null);

        await expect(ChatService.removeParticipant(chatId, userId, removedBy)).rejects.toThrow(
          'Only rescue staff can remove other participants'
        );

        expect(MockedChatParticipant.destroy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Message reactions', () => {
    describe('when adding a reaction to a message', () => {
      it('should allow participants to add reactions', async () => {
        const messageId = 'msg-123';
        const userId = 'user-456';
        const emoji = '👍';

        const mockMessage = {
          message_id: messageId,
          chat_id: 'chat-789',
          addReaction: vi.fn(),
          save: vi.fn().mockResolvedValue(undefined),
        };

        const mockParticipant = {
          chat_id: 'chat-789',
          participant_id: userId,
        };

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(mockMessage);
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(mockParticipant);

        const result = await ChatService.addMessageReaction(messageId, userId, emoji);

        expect(MockedMessage.findByPk).toHaveBeenCalledWith(messageId);
        expect(mockMessage.addReaction).toHaveBeenCalledWith(userId, emoji);
        expect(mockMessage.save).toHaveBeenCalled();
        expect(result).toEqual(mockMessage);
      });

      it('should reject when user is not a participant', async () => {
        const messageId = 'msg-123';
        const userId = 'non-participant-456';
        const emoji = '👍';

        const mockMessage = {
          message_id: messageId,
          chat_id: 'chat-789',
        };

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(mockMessage);
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(null);

        await expect(ChatService.addMessageReaction(messageId, userId, emoji)).rejects.toThrow(
          'User is not a participant in this chat'
        );

        expect(MockedMessage.findByPk).toHaveBeenCalledWith(messageId);
      });

      it('should reject when message does not exist', async () => {
        const messageId = 'non-existent-msg';
        const userId = 'user-456';
        const emoji = '👍';

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(null);

        await expect(ChatService.addMessageReaction(messageId, userId, emoji)).rejects.toThrow(
          'Message not found'
        );
      });
    });

    describe('when removing a reaction from a message', () => {
      it('should allow users to remove their reactions', async () => {
        const messageId = 'msg-123';
        const userId = 'user-456';
        const emoji = '👍';

        const mockMessage = {
          message_id: messageId,
          removeReaction: vi.fn(),
          save: vi.fn().mockResolvedValue(undefined),
        };

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(mockMessage);

        const result = await ChatService.removeMessageReaction(messageId, userId, emoji);

        expect(mockMessage.removeReaction).toHaveBeenCalledWith(userId, emoji);
        expect(mockMessage.save).toHaveBeenCalled();
        expect(result).toEqual(mockMessage);
      });
    });
  });

  describe('Message search', () => {
    describe('when searching messages with filters', () => {
      it('should search messages by content', async () => {
        const query = 'adoption';
        const chatId = 'chat-123';

        const mockMessages = [
          {
            message_id: 'msg-001',
            content: 'I want to start the adoption process',
            chat_id: chatId,
            sender_id: 'user-123',
            content_format: MessageContentFormat.PLAIN,
            created_at: new Date(),
            updated_at: new Date(),
            attachments: [],
          },
          {
            message_id: 'msg-002',
            content: 'Tell me about adoption requirements',
            chat_id: chatId,
            sender_id: 'user-456',
            content_format: MessageContentFormat.PLAIN,
            created_at: new Date(),
            updated_at: new Date(),
            attachments: [],
          },
        ];

        (MockedMessage.findAndCountAll as vi.Mock).mockResolvedValue({
          rows: mockMessages,
          count: 2,
        });

        const result = await ChatService.searchMessagesWithFilters({
          query,
          chatId,
          page: 1,
          limit: 20,
        });

        expect(MockedMessage.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              chat_id: chatId,
              content: { [Op.iLike]: `%${query}%` },
            }),
          })
        );

        expect(result.messages).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('should filter messages by sender', async () => {
        const senderId = 'user-456';
        const query = 'hello';

        (MockedMessage.findAndCountAll as vi.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await ChatService.searchMessagesWithFilters({
          query,
          senderId,
          page: 1,
          limit: 20,
        });

        expect(MockedMessage.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              sender_id: senderId,
              content: { [Op.iLike]: `%${query}%` },
            }),
          })
        );
      });

      it('should filter messages by date range', async () => {
        const query = 'test';
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-01-31');

        (MockedMessage.findAndCountAll as vi.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await ChatService.searchMessagesWithFilters({
          query,
          dateRange: { start: startDate, end: endDate },
          page: 1,
          limit: 20,
        });

        expect(MockedMessage.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              created_at: {
                [Op.between]: [startDate, endDate],
              },
            }),
          })
        );
      });
    });
  });

  describe('Chat analytics', () => {
    describe('when getting chat analytics', () => {
      it('should return analytics for all chats', async () => {
        const totalMessages = 150;
        const totalChats = 25;
        const activeChats = 20;

        (MockedMessage.count as vi.Mock).mockResolvedValue(totalMessages);
        (MockedChat.count as vi.Mock)
          .mockResolvedValueOnce(totalChats) // Total chats
          .mockResolvedValueOnce(activeChats); // Active chats

        const result = await ChatService.getChatAnalytics();

        expect(result.totalMessages).toBe(totalMessages);
        expect(result.totalChats).toBe(totalChats);
        expect(result.activeChats).toBe(activeChats);
        expect(result.averageMessagesPerChat).toBe(6); // 150 / 25
      });

      it('should return analytics for a specific rescue', async () => {
        const rescueId = 'rescue-123';
        const totalMessages = 50;
        const totalChats = 10;

        (MockedMessage.count as vi.Mock).mockResolvedValue(totalMessages);
        (MockedChat.count as vi.Mock).mockResolvedValue(totalChats);

        const result = await ChatService.getChatAnalytics(undefined, rescueId);

        expect(MockedMessage.count).toHaveBeenCalledWith({
          where: expect.objectContaining({
            rescue_id: rescueId,
          }),
        });

        expect(result.totalMessages).toBe(totalMessages);
        expect(result.totalChats).toBe(totalChats);
      });

      it('should handle zero chats gracefully', async () => {
        (MockedMessage.count as vi.Mock).mockResolvedValue(0);
        (MockedChat.count as vi.Mock).mockResolvedValue(0);

        const result = await ChatService.getChatAnalytics();

        expect(result.averageMessagesPerChat).toBe(0);
      });
    });
  });

  describe('Message moderation', () => {
    describe('when deleting a message', () => {
      it('should soft delete the message content', async () => {
        const messageId = 'msg-123';
        const deletedBy = 'moderator-456';
        const reason = 'Inappropriate content';

        const mockMessage = {
          message_id: messageId,
          chat_id: 'chat-789',
          content: 'Original message content',
          update: vi.fn().mockResolvedValue(undefined),
        };

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(mockMessage);

        await ChatService.deleteMessage(messageId, deletedBy, reason);

        expect(mockMessage.update).toHaveBeenCalledWith({
          updated_at: expect.any(Date),
          content: '[Message deleted]',
        });

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'MESSAGE_DELETED',
            entity: 'Message',
            entityId: messageId,
            details: expect.objectContaining({
              chatId: 'chat-789',
              reason,
            }),
          })
        );
      });

      it('should throw error when message not found', async () => {
        const messageId = 'non-existent-msg';
        const deletedBy = 'moderator-456';

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(null);

        await expect(ChatService.deleteMessage(messageId, deletedBy)).rejects.toThrow(
          'Message not found'
        );
      });
    });

    describe('when moderating a message', () => {
      it('should update message content and log moderation action', async () => {
        const moderatorId = 'moderator-456';
        const messageId = 'msg-123';
        const reason = 'Contains prohibited language';

        const mockMessage = {
          message_id: messageId,
          chat_id: 'chat-789',
          content: 'Original message',
          update: vi.fn().mockResolvedValue(undefined),
        };

        const mockParticipant = {
          chat_id: 'chat-789',
          participant_id: moderatorId,
        };

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(mockMessage);
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(mockParticipant);

        await ChatService.moderateMessage(moderatorId, messageId, reason);

        expect(mockMessage.update).toHaveBeenCalledWith({
          updated_at: expect.any(Date),
          content: '[Message moderated]',
        });

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'MESSAGE_MODERATED',
            entity: 'Message',
            entityId: messageId,
            details: expect.objectContaining({
              reason,
            }),
          })
        );
      });

      it('should reject when moderator is not a participant', async () => {
        const moderatorId = 'non-participant-456';
        const messageId = 'msg-123';
        const reason = 'Spam';

        const mockMessage = {
          message_id: messageId,
          chat_id: 'chat-789',
        };

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(mockMessage);
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(null);

        await expect(ChatService.moderateMessage(moderatorId, messageId, reason)).rejects.toThrow(
          'User is not a participant in this chat'
        );
      });
    });

    describe('when reporting content', () => {
      it('should create a report and log the action', async () => {
        const reportedBy = 'user-456';
        const chatId = 'chat-123';
        const messageId = 'msg-789';
        const reason = 'Spam';
        const description = 'This message contains spam links';

        const result = await ChatService.reportContent(
          reportedBy,
          chatId,
          reason,
          messageId,
          description
        );

        expect(result.success).toBe(true);

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CHAT_REPORTED',
            entity: 'Chat',
            entityId: chatId,
            details: expect.objectContaining({
              reason,
              description,
              messageId,
            }),
          })
        );
      });

      it('should handle reports without message ID', async () => {
        const reportedBy = 'user-456';
        const chatId = 'chat-123';
        const reason = 'Inappropriate behavior';

        const result = await ChatService.reportContent(reportedBy, chatId, reason);

        expect(result.success).toBe(true);

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              messageId: null,
            }),
          })
        );
      });
    });
  });
});
