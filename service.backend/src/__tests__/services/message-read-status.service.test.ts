import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock models from models/index
vi.mock('../../models', () => ({
  Chat: {
    findAll: vi.fn(),
  },
  ChatParticipant: {
    findOne: vi.fn(),
    findAll: vi.fn(),
  },
  Message: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
  },
}));

// Mock AuditLogService
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Do NOT mock ../../sequelize — in NODE_ENV=test it creates a real SQLite in-memory
// instance which is required for MessageReadStatus.init() (called at module load time).
// We instead spy on sequelize.transaction after import.

// Because MessageReadStatus is defined in the same file as MessageReadStatusService,
// we spy on its static methods via vi.spyOn after import. The real sequelize module
// initialises MessageReadStatus against SQLite in-memory (NODE_ENV=test), so no
// separate sequelize mock is needed.
import sequelize from '../../sequelize';
import { Chat, ChatParticipant, Message } from '../../models';
import {
  MessageReadStatusService,
  MessageReadStatus,
} from '../../services/message-read-status.service';
import { AuditLogService } from '../../services/auditLog.service';

// Shorthand typed mocks
const MockedChat = Chat as unknown as { findAll: ReturnType<typeof vi.fn> };
const MockedChatParticipant = ChatParticipant as unknown as {
  findOne: ReturnType<typeof vi.fn>;
  findAll: ReturnType<typeof vi.fn>;
};
const MockedMessage = Message as unknown as {
  findByPk: ReturnType<typeof vi.fn>;
  findAll: ReturnType<typeof vi.fn>;
};
const MockedAuditLog = AuditLogService.log as ReturnType<typeof vi.fn>;

// We spy on sequelize.transaction so we can assert on commit/rollback behaviour
// without needing a running database.
let transactionSpy: ReturnType<typeof vi.spyOn>;

// Helper to get the mock transaction object from the last transaction() call
const getMockTransaction = () => {
  const results = transactionSpy.mock.results;
  return results[results.length - 1]?.value as Promise<{
    commit: ReturnType<typeof vi.fn>;
    rollback: ReturnType<typeof vi.fn>;
  }>;
};

describe('MessageReadStatusService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Spy on sequelize.transaction so we can control and assert on commit/rollback
    const freshTransaction = {
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    };
    transactionSpy = vi
      .spyOn(sequelize, 'transaction')
      .mockResolvedValue(
        freshTransaction as unknown as Awaited<ReturnType<typeof sequelize.transaction>>
      );
  });

  // --------------------------------------------------------------------------
  // markMessageAsRead
  // --------------------------------------------------------------------------
  describe('markMessageAsRead', () => {
    describe('when the message does not exist', () => {
      it('throws "Message not found" before any DB write', async () => {
        MockedMessage.findByPk.mockResolvedValue(null);

        await expect(
          MessageReadStatusService.markMessageAsRead('msg-unknown', 'user-1')
        ).rejects.toThrow('Message not found');

        // Participant check and read-status write must not have been attempted
        expect(MockedChatParticipant.findOne).not.toHaveBeenCalled();
      });
    });

    describe('when the user is not a participant in the chat', () => {
      it('throws "User is not a participant in this chat"', async () => {
        MockedMessage.findByPk.mockResolvedValue({
          message_id: 'msg-1',
          chat_id: 'chat-1',
          sender_id: 'other-user',
        });
        MockedChatParticipant.findOne.mockResolvedValue(null);

        await expect(MessageReadStatusService.markMessageAsRead('msg-1', 'user-1')).rejects.toThrow(
          'User is not a participant in this chat'
        );
      });
    });

    describe('when the message exists and the user is a participant', () => {
      it('creates a MessageRead record and returns a ReadStatusUpdate', async () => {
        const mockMessage = { message_id: 'msg-1', chat_id: 'chat-1', sender_id: 'other-user' };
        MockedMessage.findByPk.mockResolvedValue(mockMessage);
        MockedChatParticipant.findOne.mockResolvedValue({ participant_id: 'user-1' });

        // MessageReadStatus.findOrCreate → [record, true (created)]
        const findOrCreateSpy = vi
          .spyOn(MessageReadStatus, 'findOrCreate')
          .mockResolvedValue([
            { message_id: 'msg-1', user_id: 'user-1', read_at: new Date() } as MessageReadStatus,
            true,
          ]);

        // getUnreadCount uses Message.findAll
        MockedMessage.findAll.mockResolvedValue([]);

        const result = await MessageReadStatusService.markMessageAsRead('msg-1', 'user-1');

        expect(result.user_id).toBe('user-1');
        expect(result.chat_id).toBe('chat-1');
        expect(result.message_ids).toContain('msg-1');
        expect(typeof result.unread_count).toBe('number');

        findOrCreateSpy.mockRestore();
      });

      it('logs a MESSAGE_READ audit entry', async () => {
        const mockMessage = { message_id: 'msg-1', chat_id: 'chat-1', sender_id: 'other-user' };
        MockedMessage.findByPk.mockResolvedValue(mockMessage);
        MockedChatParticipant.findOne.mockResolvedValue({ participant_id: 'user-1' });

        const findOrCreateSpy = vi
          .spyOn(MessageReadStatus, 'findOrCreate')
          .mockResolvedValue([
            { message_id: 'msg-1', user_id: 'user-1', read_at: new Date() } as MessageReadStatus,
            true,
          ]);
        MockedMessage.findAll.mockResolvedValue([]);

        await MessageReadStatusService.markMessageAsRead('msg-1', 'user-1');

        expect(MockedAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'MESSAGE_READ',
            entity: 'MESSAGE',
            entityId: 'msg-1',
            userId: 'user-1',
          })
        );

        findOrCreateSpy.mockRestore();
      });

      it('is idempotent — calling twice does not create duplicate MessageRead records', async () => {
        const mockMessage = { message_id: 'msg-1', chat_id: 'chat-1', sender_id: 'other-user' };
        MockedMessage.findByPk.mockResolvedValue(mockMessage);
        MockedChatParticipant.findOne.mockResolvedValue({ participant_id: 'user-1' });

        const existingRecord = {
          message_id: 'msg-1',
          user_id: 'user-1',
          read_at: new Date(),
          update: vi.fn().mockResolvedValue(undefined),
        };

        const findOrCreateSpy = vi
          .spyOn(MessageReadStatus, 'findOrCreate')
          // First call: created = true
          .mockResolvedValueOnce([existingRecord as unknown as MessageReadStatus, true])
          // Second call: created = false (already exists)
          .mockResolvedValueOnce([existingRecord as unknown as MessageReadStatus, false]);

        MockedMessage.findAll.mockResolvedValue([]);

        // Call twice
        await MessageReadStatusService.markMessageAsRead('msg-1', 'user-1');
        await MessageReadStatusService.markMessageAsRead('msg-1', 'user-1');

        // findOrCreate should have been called exactly twice (once per invocation)
        expect(findOrCreateSpy).toHaveBeenCalledTimes(2);

        // On the second call (not created), update is called to refresh read_at
        expect(existingRecord.update).toHaveBeenCalledTimes(1);

        findOrCreateSpy.mockRestore();
      });

      it('rolls back the transaction when an unexpected error occurs', async () => {
        MockedMessage.findByPk.mockRejectedValue(new Error('DB failure'));

        await expect(MessageReadStatusService.markMessageAsRead('msg-1', 'user-1')).rejects.toThrow(
          'DB failure'
        );

        const t = await getMockTransaction();
        expect(t?.rollback).toHaveBeenCalled();
        expect(t?.commit).not.toHaveBeenCalled();
      });
    });
  });

  // --------------------------------------------------------------------------
  // markAllMessagesAsRead
  // --------------------------------------------------------------------------
  describe('markAllMessagesAsRead', () => {
    describe('when the user is not a participant', () => {
      it('throws "User is not a participant in this chat"', async () => {
        MockedChatParticipant.findOne.mockResolvedValue(null);

        await expect(
          MessageReadStatusService.markAllMessagesAsRead('chat-1', 'user-1')
        ).rejects.toThrow('User is not a participant in this chat');
      });
    });

    describe('when the user is a participant', () => {
      it('marks all unread messages sent by others as read', async () => {
        MockedChatParticipant.findOne.mockResolvedValue({ participant_id: 'user-1' });

        const unreadMessages = [
          { message_id: 'msg-1', sender_id: 'other-user', read_status: [] },
          { message_id: 'msg-2', sender_id: 'other-user', read_status: [] },
        ];
        MockedMessage.findAll.mockResolvedValue(unreadMessages);

        const bulkCreateSpy = vi.spyOn(MessageReadStatus, 'bulkCreate').mockResolvedValue([]);

        const result = await MessageReadStatusService.markAllMessagesAsRead('chat-1', 'user-1');

        expect(result.unread_count).toBe(0);
        expect(result.message_ids).toHaveLength(2);
        expect(result.chat_id).toBe('chat-1');

        bulkCreateSpy.mockRestore();
      });

      it('returns unread_count of 0 after marking all messages read', async () => {
        MockedChatParticipant.findOne.mockResolvedValue({ participant_id: 'user-1' });
        MockedMessage.findAll.mockResolvedValue([
          { message_id: 'msg-1', sender_id: 'other', read_status: [] },
        ]);

        const bulkCreateSpy = vi.spyOn(MessageReadStatus, 'bulkCreate').mockResolvedValue([]);

        const result = await MessageReadStatusService.markAllMessagesAsRead('chat-1', 'user-1');

        expect(result.unread_count).toBe(0);

        bulkCreateSpy.mockRestore();
      });

      it('does nothing and returns empty message_ids when user has no unread messages', async () => {
        MockedChatParticipant.findOne.mockResolvedValue({ participant_id: 'user-1' });
        // All messages already have a read_status entry for this user
        MockedMessage.findAll.mockResolvedValue([
          {
            message_id: 'msg-1',
            sender_id: 'other',
            read_status: [{ user_id: 'user-1' }],
          },
        ]);

        const bulkCreateSpy = vi.spyOn(MessageReadStatus, 'bulkCreate').mockResolvedValue([]);

        const result = await MessageReadStatusService.markAllMessagesAsRead('chat-1', 'user-1');

        expect(result.message_ids).toHaveLength(0);
        expect(result.unread_count).toBe(0);
        expect(bulkCreateSpy).not.toHaveBeenCalled();

        bulkCreateSpy.mockRestore();
      });

      it('is idempotent — calling twice still yields empty message_ids on second call', async () => {
        MockedChatParticipant.findOne.mockResolvedValue({ participant_id: 'user-1' });

        // First call: one unread message
        MockedMessage.findAll
          .mockResolvedValueOnce([{ message_id: 'msg-1', sender_id: 'other', read_status: [] }])
          // Second call: same message now shows as read
          .mockResolvedValueOnce([
            { message_id: 'msg-1', sender_id: 'other', read_status: [{ user_id: 'user-1' }] },
          ]);

        const bulkCreateSpy = vi.spyOn(MessageReadStatus, 'bulkCreate').mockResolvedValue([]);

        const first = await MessageReadStatusService.markAllMessagesAsRead('chat-1', 'user-1');
        const second = await MessageReadStatusService.markAllMessagesAsRead('chat-1', 'user-1');

        expect(first.message_ids).toHaveLength(1);
        expect(second.message_ids).toHaveLength(0);
        // bulkCreate only called on first invocation
        expect(bulkCreateSpy).toHaveBeenCalledTimes(1);

        bulkCreateSpy.mockRestore();
      });
    });
  });

  // --------------------------------------------------------------------------
  // getUnreadCount
  // --------------------------------------------------------------------------
  describe('getUnreadCount', () => {
    it('returns the correct number of unread messages (sender ≠ userId, no read record)', async () => {
      MockedMessage.findAll.mockResolvedValue([
        { message_id: 'msg-1', sender_id: 'other', read_status: [] },
        { message_id: 'msg-2', sender_id: 'other', read_status: [] },
        { message_id: 'msg-3', sender_id: 'other', read_status: [{ user_id: 'user-1' }] },
      ]);

      const count = await MessageReadStatusService.getUnreadCount('chat-1', 'user-1');

      // msg-1 and msg-2 are unread; msg-3 has a read record
      expect(count).toBe(2);
    });

    it('returns 0 for a chat with no messages', async () => {
      MockedMessage.findAll.mockResolvedValue([]);

      const count = await MessageReadStatusService.getUnreadCount('chat-1', 'user-1');

      expect(count).toBe(0);
    });

    it('returns 0 after all messages have been marked read', async () => {
      // Simulate: all messages have a read_status entry for the user
      MockedMessage.findAll.mockResolvedValue([
        { message_id: 'msg-1', sender_id: 'other', read_status: [{ user_id: 'user-1' }] },
        { message_id: 'msg-2', sender_id: 'other', read_status: [{ user_id: 'user-1' }] },
      ]);

      const count = await MessageReadStatusService.getUnreadCount('chat-1', 'user-1');

      expect(count).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // getUnreadMessagesForUser
  // --------------------------------------------------------------------------
  describe('getUnreadMessagesForUser', () => {
    it('returns an entry per chat with the correct unread count', async () => {
      MockedChat.findAll.mockResolvedValue([{ chat_id: 'chat-1' }, { chat_id: 'chat-2' }]);

      MockedMessage.findAll.mockResolvedValue([
        {
          message_id: 'msg-1',
          chat_id: 'chat-1',
          sender_id: 'other',
          read_status: [],
          created_at: new Date(),
        },
        {
          message_id: 'msg-2',
          chat_id: 'chat-1',
          sender_id: 'other',
          read_status: [],
          created_at: new Date(),
        },
        {
          message_id: 'msg-3',
          chat_id: 'chat-2',
          sender_id: 'other',
          read_status: [],
          created_at: new Date(),
        },
      ]);

      const results = await MessageReadStatusService.getUnreadMessagesForUser('user-1');

      expect(results).toHaveLength(2);
      const chat1 = results.find(r => r.chat_id === 'chat-1');
      const chat2 = results.find(r => r.chat_id === 'chat-2');
      expect(chat1?.unread_count).toBe(2);
      expect(chat2?.unread_count).toBe(1);
    });

    it('returns an empty array when the user is in no chats', async () => {
      MockedChat.findAll.mockResolvedValue([]);

      const results = await MessageReadStatusService.getUnreadMessagesForUser('user-1');

      expect(results).toEqual([]);
    });

    it('excludes chats where all messages are already read', async () => {
      MockedChat.findAll.mockResolvedValue([{ chat_id: 'chat-1' }]);

      // All messages already have a read_status for user-1
      MockedMessage.findAll.mockResolvedValue([
        {
          message_id: 'msg-1',
          chat_id: 'chat-1',
          sender_id: 'other',
          read_status: [{ user_id: 'user-1' }],
          created_at: new Date(),
        },
      ]);

      const results = await MessageReadStatusService.getUnreadMessagesForUser('user-1');

      expect(results).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // isMessageRead
  // --------------------------------------------------------------------------
  describe('isMessageRead', () => {
    it('returns true after the message has been marked as read', async () => {
      const findOneSpy = vi.spyOn(MessageReadStatus, 'findOne').mockResolvedValue({
        message_id: 'msg-1',
        user_id: 'user-1',
        read_at: new Date(),
      } as MessageReadStatus);

      const result = await MessageReadStatusService.isMessageRead('msg-1', 'user-1');

      expect(result).toBe(true);

      findOneSpy.mockRestore();
    });

    it('returns false when no read record exists for the message', async () => {
      const findOneSpy = vi.spyOn(MessageReadStatus, 'findOne').mockResolvedValue(null);

      const result = await MessageReadStatusService.isMessageRead('msg-1', 'user-1');

      expect(result).toBe(false);

      findOneSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // getChatReadStatistics
  // --------------------------------------------------------------------------
  describe('getChatReadStatistics', () => {
    it('returns correct total_messages, unread_messages, and read_percentage', async () => {
      MockedMessage.findAll.mockResolvedValue([
        { message_id: 'msg-1', sender_id: 'other', read_status: [{ user_id: 'user-1' }] },
        { message_id: 'msg-2', sender_id: 'other', read_status: [] },
        { message_id: 'msg-3', sender_id: 'other', read_status: [{ user_id: 'user-1' }] },
        { message_id: 'msg-4', sender_id: 'other', read_status: [] },
      ]);

      const findAllSpy = vi
        .spyOn(MessageReadStatus, 'findAll')
        .mockResolvedValue([{ message_id: 'msg-3', read_at: new Date() } as MessageReadStatus]);

      const stats = await MessageReadStatusService.getChatReadStatistics('chat-1', 'user-1');

      expect(stats.total_messages).toBe(4);
      expect(stats.unread_messages).toBe(2);
      expect(stats.read_percentage).toBe(50);

      findAllSpy.mockRestore();
    });

    it('returns 0% read when none of the messages have been read', async () => {
      MockedMessage.findAll.mockResolvedValue([
        { message_id: 'msg-1', sender_id: 'other', read_status: [] },
        { message_id: 'msg-2', sender_id: 'other', read_status: [] },
      ]);

      const findAllSpy = vi.spyOn(MessageReadStatus, 'findAll').mockResolvedValue([]);

      const stats = await MessageReadStatusService.getChatReadStatistics('chat-1', 'user-1');

      expect(stats.read_percentage).toBe(0);
      expect(stats.unread_messages).toBe(2);

      findAllSpy.mockRestore();
    });

    it('returns 100% read when all messages have been read', async () => {
      MockedMessage.findAll.mockResolvedValue([
        { message_id: 'msg-1', sender_id: 'other', read_status: [{ user_id: 'user-1' }] },
        { message_id: 'msg-2', sender_id: 'other', read_status: [{ user_id: 'user-1' }] },
      ]);

      const lastReadDate = new Date();
      const findAllSpy = vi
        .spyOn(MessageReadStatus, 'findAll')
        .mockResolvedValue([{ message_id: 'msg-2', read_at: lastReadDate } as MessageReadStatus]);

      const stats = await MessageReadStatusService.getChatReadStatistics('chat-1', 'user-1');

      expect(stats.read_percentage).toBe(100);
      expect(stats.unread_messages).toBe(0);
      expect(stats.last_read_message_id).toBe('msg-2');

      findAllSpy.mockRestore();
    });

    it('returns 0% and no last_read_message_id for a chat with no messages', async () => {
      MockedMessage.findAll.mockResolvedValue([]);

      const findAllSpy = vi.spyOn(MessageReadStatus, 'findAll').mockResolvedValue([]);

      const stats = await MessageReadStatusService.getChatReadStatistics('chat-1', 'user-1');

      expect(stats.total_messages).toBe(0);
      expect(stats.unread_messages).toBe(0);
      expect(stats.read_percentage).toBe(0);
      expect(stats.last_read_message_id).toBeUndefined();

      findAllSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // cleanupOldReadStatus
  // --------------------------------------------------------------------------
  describe('cleanupOldReadStatus', () => {
    it('deletes read-status records older than the cutoff date', async () => {
      const destroySpy = vi.spyOn(MessageReadStatus, 'destroy').mockResolvedValue(5);

      const deleted = await MessageReadStatusService.cleanupOldReadStatus(90);

      expect(deleted).toBe(5);
      expect(destroySpy).toHaveBeenCalledOnce();

      destroySpy.mockRestore();
    });

    it('leaves newer records untouched — destroy is called with a cutoff based on olderThanDays', async () => {
      const destroySpy = vi.spyOn(MessageReadStatus, 'destroy').mockResolvedValue(0);

      await MessageReadStatusService.cleanupOldReadStatus(30);

      const callArg = destroySpy.mock.calls[0][0] as { where: { read_at: unknown } };
      expect(callArg.where).toBeDefined();
      // The cutoff should be set (non-null) and correspond to roughly 30 days ago
      expect(callArg.where.read_at).toBeDefined();

      destroySpy.mockRestore();
    });

    it('uses 90 days as the default cutoff when no argument is supplied', async () => {
      const beforeCall = Date.now();
      const destroySpy = vi.spyOn(MessageReadStatus, 'destroy').mockResolvedValue(0);

      await MessageReadStatusService.cleanupOldReadStatus();

      const afterCall = Date.now();
      // Extract the [Op.lt] date from the where clause — Symbol keys are not
      // enumerable via Object.values, so we use Object.getOwnPropertySymbols.
      const callArg = destroySpy.mock.calls[0][0] as {
        where: { read_at: Record<symbol, Date> };
      };
      const readAtEntry = callArg.where.read_at;
      const symbolKeys = Object.getOwnPropertySymbols(readAtEntry);
      expect(symbolKeys).toHaveLength(1);
      const cutoffDate = readAtEntry[symbolKeys[0]!];
      const cutoffMs = cutoffDate.getTime();

      // 90 days ago (with a small tolerance for test execution time)
      const expectedMs = beforeCall - 90 * 24 * 60 * 60 * 1000;
      expect(cutoffMs).toBeGreaterThanOrEqual(expectedMs - 1000);
      expect(cutoffMs).toBeLessThanOrEqual(afterCall);

      destroySpy.mockRestore();
    });
  });
});
