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

// Mock MessageReaction (plan 2.1) — chat.service uses it for the
// reactions add/remove/list paths.
vi.mock('../../models/MessageReaction', () => ({
  __esModule: true,
  default: {
    findOrCreate: vi.fn(),
    destroy: vi.fn(),
    findAll: vi.fn(),
  },
}));

// Mock MessageRead (plan 2.1) — chat.service uses it for the
// markMessagesAsRead / getUnreadMessageCount / getMessageStatuses paths.
vi.mock('../../models/MessageRead', () => ({
  __esModule: true,
  default: {
    findOrCreate: vi.fn(),
    bulkCreate: vi.fn(),
    findAll: vi.fn(),
    destroy: vi.fn(),
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
import MessageReaction from '../../models/MessageReaction';
import MessageRead from '../../models/MessageRead';
import { ChatService } from '../../services/chat.service';
import { ChatStatus, ParticipantRole, MessageContentFormat } from '../../types/chat';
import { AuditLogService } from '../../services/auditLog.service';
import { NotificationService } from '../../services/notification.service';

const MockedChat = Chat as vi.MockedObject<Chat>;
const MockedChatParticipant = ChatParticipant as vi.MockedObject<ChatParticipant>;
const MockedMessage = Message as vi.MockedObject<Message>;
const MockedMessageReaction = MessageReaction as vi.MockedObject<typeof MessageReaction>;
const MockedMessageRead = MessageRead as vi.MockedObject<typeof MessageRead>;
const MockedUser = User as vi.MockedObject<User>;
const mockAuditLogAction = AuditLogService.log as vi.MockedFunction<typeof AuditLogService.log>;
const mockCreateNotification = NotificationService.createNotification as vi.MockedFunction<
  typeof NotificationService.createNotification
>;

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: the caller is a participant. Individual tests that are
    // specifically exercising the "not a participant" rejection path
    // override this with mockResolvedValueOnce(null).
    (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue({
      chat_participant_id: 'p-default',
      chat_id: 'chat-default',
      participant_id: 'user-default',
    });
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

  describe('Getting a chat by id with authorization', () => {
    const chatId = 'chat-abc';
    const participantId = 'user-participant';
    const strangerId = 'user-stranger';
    const mockChat = {
      chat_id: chatId,
      rescue_id: 'rescue-xyz',
      status: ChatStatus.ACTIVE,
    };

    describe('when the caller is a participant', () => {
      it('returns the chat', async () => {
        (MockedChat.findByPk as vi.Mock).mockResolvedValue(mockChat);
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue({
          chat_id: chatId,
          participant_id: participantId,
        });

        const result = await ChatService.getChatById(chatId, participantId);

        expect(result).toEqual(mockChat);
        expect(MockedChatParticipant.findOne).toHaveBeenCalledWith({
          where: { chat_id: chatId, participant_id: participantId },
        });
      });
    });

    describe('when the caller is not a participant', () => {
      it('throws a forbidden-style error', async () => {
        (MockedChat.findByPk as vi.Mock).mockResolvedValue(mockChat);
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(null);

        await expect(ChatService.getChatById(chatId, strangerId)).rejects.toThrow(
          /not a participant/i
        );
      });
    });

    describe('when no userId is supplied (admin bypass)', () => {
      it('returns the chat without checking participation', async () => {
        (MockedChat.findByPk as vi.Mock).mockResolvedValue(mockChat);

        const result = await ChatService.getChatById(chatId);

        expect(result).toEqual(mockChat);
        expect(MockedChatParticipant.findOne).not.toHaveBeenCalled();
      });
    });

    describe('when the chat does not exist', () => {
      it('returns null', async () => {
        (MockedChat.findByPk as vi.Mock).mockResolvedValue(null);

        const result = await ChatService.getChatById(chatId, participantId);

        expect(result).toBeNull();
        // Participant lookup should be skipped when chat is absent.
        expect(MockedChatParticipant.findOne).not.toHaveBeenCalled();
      });
    });
  });

  describe('Participant authorization on chat-scoped methods', () => {
    // These tests don't care about the data the methods return — they exist
    // to guarantee every chat-scoped method rejects non-participants with
    // the unified error string, and that the admin bypass (userId undefined)
    // skips the check.
    const chatId = 'chat-xyz';
    const strangerId = 'stranger-999';

    const setupNonParticipant = () => {
      (MockedChatParticipant.findOne as vi.Mock).mockReset();
      (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(null);
    };

    describe('getMessages', () => {
      it('throws when caller is not a participant', async () => {
        setupNonParticipant();
        await expect(ChatService.getMessages(chatId, { userId: strangerId })).rejects.toThrow(
          'User is not a participant in this chat'
        );
      });

      it('skips the check when userId is undefined (admin bypass)', async () => {
        (MockedMessage.findAndCountAll as vi.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });
        (MockedChatParticipant.findOne as vi.Mock).mockReset();
        await ChatService.getMessages(chatId);
        expect(MockedChatParticipant.findOne).not.toHaveBeenCalled();
      });

      it('does not crash when a message has undefined created_at or updated_at', async () => {
        (MockedMessage.findAndCountAll as vi.Mock).mockResolvedValue({
          rows: [
            {
              message_id: 'msg-001',
              chat_id: chatId,
              sender_id: 'user-1',
              content: 'hello',
              content_format: 'text',
              attachments: [],
              created_at: undefined,
              updated_at: undefined,
              Sender: { userId: 'user-1', firstName: 'A', lastName: 'B' },
            },
          ],
          count: 1,
        });
        (MockedChatParticipant.findOne as vi.Mock).mockReset();
        const result = await ChatService.getMessages(chatId);
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].created_at).toBeDefined();
        expect(result.messages[0].updated_at).toBeDefined();
      });
    });

    describe('markMessagesAsRead', () => {
      it('throws when caller is not a participant', async () => {
        setupNonParticipant();
        await expect(ChatService.markMessagesAsRead(chatId, strangerId)).rejects.toThrow(
          'User is not a participant in this chat'
        );
      });
    });

    describe('getUnreadMessageCount', () => {
      it('throws when caller is not a participant', async () => {
        setupNonParticipant();
        await expect(ChatService.getUnreadMessageCount(chatId, strangerId)).rejects.toThrow(
          'User is not a participant in this chat'
        );
      });
    });

    describe('removeMessageReaction', () => {
      it('throws when caller is not a participant', async () => {
        const messageId = 'msg-abc';
        (MockedMessage.findByPk as vi.Mock).mockResolvedValue({
          message_id: messageId,
          chat_id: chatId,
          removeReaction: vi.fn(),
          save: vi.fn(),
        });
        setupNonParticipant();
        await expect(
          ChatService.removeMessageReaction(messageId, strangerId, '👍')
        ).rejects.toThrow('User is not a participant in this chat');
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
        ).rejects.toThrow('User is not a participant in this chat');

        expect(MockedMessage.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Read receipts and unread counts', () => {
    // Read receipts moved to the message_reads table (plan 2.1) —
    // these tests assert the typed-table writes / reads instead of the
    // removed Message.markAsRead / isReadBy instance methods.
    describe('when marking messages as read', () => {
      it('should mark all unread messages in a chat as read for the user', async () => {
        const chatId = 'chat-123';
        const userId = 'user-456';

        const mockMessages = [
          { message_id: 'msg-001', chat_id: chatId, sender_id: 'other-user' },
          { message_id: 'msg-002', chat_id: chatId, sender_id: 'other-user' },
        ];

        (MockedMessage.findAll as vi.Mock).mockResolvedValue(mockMessages);
        (MockedMessageRead.bulkCreate as vi.Mock).mockResolvedValue([]);

        const result = await ChatService.markMessagesAsRead(chatId, userId);

        expect(MockedMessage.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { chat_id: chatId, sender_id: { [Op.ne]: userId } },
          })
        );

        expect(MockedMessageRead.bulkCreate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ message_id: 'msg-001', user_id: userId }),
            expect.objectContaining({ message_id: 'msg-002', user_id: userId }),
          ]),
          expect.objectContaining({ ignoreDuplicates: true })
        );
        expect(result).toBe(true);
      });

      it('should be a no-op when there are no candidate messages', async () => {
        // (plan 2.1) — uniqueness on (message_id, user_id) means
        // re-marking already-read messages is harmless. The "skip
        // already read" check is handled at the index level via
        // ignoreDuplicates rather than as an explicit JS filter, so
        // the only branch worth covering here is the empty case.
        (MockedMessage.findAll as vi.Mock).mockResolvedValue([]);

        await ChatService.markMessagesAsRead('chat-123', 'user-456');

        expect(MockedMessageRead.bulkCreate).not.toHaveBeenCalled();
      });
    });

    describe('when getting unread message count', () => {
      it('should return the count of unread messages for a user', async () => {
        const chatId = 'chat-123';
        const userId = 'user-456';

        const mockMessages = [
          { message_id: 'msg-001', sender_id: 'other-user', Reads: [] },
          { message_id: 'msg-002', sender_id: 'other-user', Reads: [] },
          {
            message_id: 'msg-003',
            sender_id: 'other-user',
            Reads: [{ user_id: userId, read_at: new Date() }],
          },
        ];

        (MockedMessage.findAll as vi.Mock).mockResolvedValue(mockMessages);

        const count = await ChatService.getUnreadMessageCount(chatId, userId);

        expect(count).toBe(2);
        expect(MockedMessage.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { chat_id: chatId, sender_id: { [Op.ne]: userId } },
            include: expect.arrayContaining([
              expect.objectContaining({ as: 'Reads', where: { user_id: userId } }),
            ]),
          })
        );
      });

      it('should return zero when all messages are read', async () => {
        const chatId = 'chat-123';
        const userId = 'user-456';

        const mockMessages = [
          {
            message_id: 'msg-001',
            sender_id: 'other-user',
            Reads: [{ user_id: userId, read_at: new Date() }],
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
    // Reactions live in the message_reactions table now (plan 2.1).
    // ChatService delegates to MessageReaction.findOrCreate /
    // MessageReaction.destroy instead of mutating the Message instance.
    describe('when adding a reaction to a message', () => {
      it('should allow participants to add reactions', async () => {
        const messageId = 'msg-123';
        const userId = 'user-456';
        const emoji = '👍';

        const mockMessage = { message_id: messageId, chat_id: 'chat-789' };
        const mockParticipant = { chat_id: 'chat-789', participant_id: userId };

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(mockMessage);
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(mockParticipant);
        (MockedMessageReaction.findOrCreate as vi.Mock).mockResolvedValue([{}, true]);

        const result = await ChatService.addMessageReaction(messageId, userId, emoji);

        expect(MockedMessage.findByPk).toHaveBeenCalledWith(messageId);
        expect(MockedMessageReaction.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { message_id: messageId, user_id: userId, emoji },
          })
        );
        expect(result).toEqual(mockMessage);
      });

      it('should reject when user is not a participant', async () => {
        const messageId = 'msg-123';
        const userId = 'non-participant-456';
        const emoji = '👍';

        const mockMessage = { message_id: messageId, chat_id: 'chat-789' };

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

        const mockMessage = { message_id: messageId, chat_id: 'chat-789' };
        const mockParticipant = { chat_id: 'chat-789', participant_id: userId };

        (MockedMessage.findByPk as vi.Mock).mockResolvedValue(mockMessage);
        (MockedChatParticipant.findOne as vi.Mock).mockResolvedValue(mockParticipant);
        (MockedMessageReaction.destroy as vi.Mock).mockResolvedValue(1);

        const result = await ChatService.removeMessageReaction(messageId, userId, emoji);

        expect(MockedMessageReaction.destroy).toHaveBeenCalledWith({
          where: { message_id: messageId, user_id: userId, emoji },
        });
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
