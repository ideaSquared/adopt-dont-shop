import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Op } from 'sequelize';

vi.mock('../../models/Report', () => ({
  __esModule: true,
  default: { findAndCountAll: vi.fn() },
  ReportStatus: {},
  ReportSeverity: {},
}));

vi.mock('../../models/SupportTicket', () => ({
  __esModule: true,
  default: { findAndCountAll: vi.fn() },
  TicketStatus: {},
  TicketPriority: {},
}));

vi.mock('../../models/Chat', () => ({
  __esModule: true,
  Chat: { findAll: vi.fn(), count: vi.fn() },
}));

vi.mock('../../models/ChatParticipant', () => ({
  __esModule: true,
  ChatParticipant: {},
  default: {},
}));

vi.mock('../../models/User', () => ({
  __esModule: true,
  default: {},
}));

vi.mock('../../types/chat', () => ({
  ChatStatus: { ACTIVE: 'active', LOCKED: 'locked', ARCHIVED: 'archived' },
}));

import Report from '../../models/Report';
import SupportTicket from '../../models/SupportTicket';
import { Chat } from '../../models/Chat';
import { getInboxItems } from '../../services/inbox.service';

describe('getInboxItems search escaping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('moderation report search', () => {
    it('passes a plain search term as-is in the LIKE pattern', async () => {
      vi.mocked(Report.findAndCountAll).mockResolvedValue({ rows: [], count: 0 });

      await getInboxItems({ source: 'moderation', search: 'spam' });

      expect(Report.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: [
              { title: { [Op.iLike]: '%spam%' } },
              { description: { [Op.iLike]: '%spam%' } },
            ],
          }),
        })
      );
    });

    it('escapes % so it matches literally rather than acting as a wildcard', async () => {
      vi.mocked(Report.findAndCountAll).mockResolvedValue({ rows: [], count: 0 });

      await getInboxItems({ source: 'moderation', search: '%' });

      expect(Report.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: [{ title: { [Op.iLike]: '%\\%%' } }, { description: { [Op.iLike]: '%\\%%' } }],
          }),
        })
      );
    });

    it('escapes _ so it matches literally rather than acting as a wildcard', async () => {
      vi.mocked(Report.findAndCountAll).mockResolvedValue({ rows: [], count: 0 });

      await getInboxItems({ source: 'moderation', search: 'a_b' });

      expect(Report.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: [
              { title: { [Op.iLike]: '%a\\_b%' } },
              { description: { [Op.iLike]: '%a\\_b%' } },
            ],
          }),
        })
      );
    });

    it('does not add Op.or when no search term is given', async () => {
      vi.mocked(Report.findAndCountAll).mockResolvedValue({ rows: [], count: 0 });

      await getInboxItems({ source: 'moderation' });

      const call = vi.mocked(Report.findAndCountAll).mock.calls[0][0] as {
        where: Record<symbol, unknown>;
      };
      expect(call.where[Op.or]).toBeUndefined();
    });
  });

  describe('support ticket search', () => {
    it('passes a plain search term as-is in the LIKE pattern', async () => {
      vi.mocked(SupportTicket.findAndCountAll).mockResolvedValue({ rows: [], count: 0 });

      await getInboxItems({ source: 'support', search: 'login' });

      expect(SupportTicket.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: [
              { subject: { [Op.iLike]: '%login%' } },
              { description: { [Op.iLike]: '%login%' } },
            ],
          }),
        })
      );
    });

    it('escapes % so it matches literally rather than acting as a wildcard', async () => {
      vi.mocked(SupportTicket.findAndCountAll).mockResolvedValue({ rows: [], count: 0 });

      await getInboxItems({ source: 'support', search: '%' });

      expect(SupportTicket.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: [
              { subject: { [Op.iLike]: '%\\%%' } },
              { description: { [Op.iLike]: '%\\%%' } },
            ],
          }),
        })
      );
    });

    it('escapes _ so it matches literally rather than acting as a wildcard', async () => {
      vi.mocked(SupportTicket.findAndCountAll).mockResolvedValue({ rows: [], count: 0 });

      await getInboxItems({ source: 'support', search: 'foo_bar' });

      expect(SupportTicket.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: [
              { subject: { [Op.iLike]: '%foo\\_bar%' } },
              { description: { [Op.iLike]: '%foo\\_bar%' } },
            ],
          }),
        })
      );
    });

    it('does not add Op.or when no search term is given', async () => {
      vi.mocked(SupportTicket.findAndCountAll).mockResolvedValue({ rows: [], count: 0 });

      await getInboxItems({ source: 'support' });

      const call = vi.mocked(SupportTicket.findAndCountAll).mock.calls[0][0] as {
        where: Record<symbol, unknown>;
      };
      expect(call.where[Op.or]).toBeUndefined();
    });
  });

  describe('pagination total reflects all matching rows, not the per-source cap (ADS-696)', () => {
    it('uses Sequelize counts so total can exceed the per-source fetch limit', async () => {
      vi.mocked(Report.findAndCountAll).mockResolvedValue({ rows: [], count: 500 });
      vi.mocked(SupportTicket.findAndCountAll).mockResolvedValue({ rows: [], count: 250 });
      vi.mocked(Chat.findAll).mockResolvedValue([]);
      vi.mocked(Chat.count).mockResolvedValue(75);

      const result = await getInboxItems({});

      expect(result.pagination.total).toBe(825);
      expect(result.pagination.totalPages).toBe(Math.ceil(825 / 20));
    });

    it('excludes chats when severity filter is not one of the derivable values', async () => {
      vi.mocked(Report.findAndCountAll).mockResolvedValue({ rows: [], count: 10 });
      vi.mocked(SupportTicket.findAndCountAll).mockResolvedValue({ rows: [], count: 0 });
      vi.mocked(Chat.findAll).mockResolvedValue([]);
      vi.mocked(Chat.count).mockResolvedValue(99);

      const result = await getInboxItems({ severity: 'critical' });

      expect(Chat.findAll).not.toHaveBeenCalled();
      expect(Chat.count).not.toHaveBeenCalled();
      expect(result.pagination.total).toBe(10);
    });
  });
});
