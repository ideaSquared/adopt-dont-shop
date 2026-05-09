import { Sequelize } from 'sequelize';
import { describe, expect, it, vi } from 'vitest';

// Bypass the real sequelize instance — we only need the models' rawAttributes
// (shape metadata), not a live DB connection.
vi.mock('../../sequelize', () => ({
  __esModule: true,
  default: new Sequelize('sqlite::memory:', { logging: false }),
}));

import Chat from '../../models/Chat';
import { ChatParticipant } from '../../models/ChatParticipant';
import Message from '../../models/Message';

/**
 * Model-shape regression tests for the chat-family models.
 *
 * Every column below is NOT NULL in the DB. Before these defaults were
 * declared, ChatService.sendMessage and ChatService.createChat were
 * hitting PostgreSQL not-null violations because the service layer
 * passed only the business fields (chat_id, sender_id, content, …) and
 * the model contributed no defaults for:
 *   - primary keys (chat_id / message_id / chat_participant_id)
 *   - JSON array columns (reactions / read_status / attachments)
 *
 * We were chasing these one column at a time via "Error loading
 * messages: HTTP 500" reports. Locking them in at the model level stops
 * that loop.
 */
describe('Chat-family model defaults', () => {
  describe('Message', () => {
    const attrs = Message.rawAttributes as Record<string, any>;

    it('message_id has a defaultValue so inserts without an explicit id succeed', () => {
      expect(attrs.message_id.primaryKey).toBe(true);
      expect(attrs.message_id.defaultValue).toBeDefined();
    });

    it('does not carry a reactions JSONB column (moved to message_reactions per plan 2.1)', () => {
      expect(attrs.reactions).toBeUndefined();
    });

    it('does not carry a read_status JSONB column (moved to message_reads per plan 2.1)', () => {
      expect(attrs.read_status).toBeUndefined();
    });

    it('attachments defaults to an empty array', () => {
      expect(attrs.attachments.allowNull).toBe(false);
      expect(Array.isArray(attrs.attachments.defaultValue)).toBe(true);
    });
  });

  describe('Chat', () => {
    const attrs = Chat.rawAttributes as Record<string, any>;

    it('chat_id has a defaultValue so new chats don’t need a caller-supplied id', () => {
      expect(attrs.chat_id.primaryKey).toBe(true);
      expect(attrs.chat_id.defaultValue).toBeDefined();
    });
  });

  describe('ChatParticipant', () => {
    const attrs = ChatParticipant.rawAttributes as Record<string, any>;

    it('chat_participant_id has a defaultValue so createChat participant inserts succeed', () => {
      expect(attrs.chat_participant_id.primaryKey).toBe(true);
      expect(attrs.chat_participant_id.defaultValue).toBeDefined();
    });
  });
});
