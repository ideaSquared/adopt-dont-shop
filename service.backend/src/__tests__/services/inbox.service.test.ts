import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Op } from 'sequelize';

vi.mock('../../models/Report', () => ({
  __esModule: true,
  default: { findAll: vi.fn() },
  ReportStatus: {},
  ReportSeverity: {},
}));

vi.mock('../../models/SupportTicket', () => ({
  __esModule: true,
  default: { findAll: vi.fn() },
  TicketStatus: {},
  TicketPriority: {},
}));

vi.mock('../../models/Chat', () => ({
  __esModule: true,
  Chat: { findAll: vi.fn() },
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
import { getInboxItems } from '../../services/inbox.service';

describe('getInboxItems search escaping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('moderation report search', () => {
    it('passes a plain search term as-is in the LIKE pattern', async () => {
      vi.mocked(Report.findAll).mockResolvedValue([]);

      await getInboxItems({ source: 'moderation', search: 'spam' });

      expect(Report.findAll).toHaveBeenCalledWith(
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
      vi.mocked(Report.findAll).mockResolvedValue([]);

      await getInboxItems({ source: 'moderation', search: '%' });

      expect(Report.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: [{ title: { [Op.iLike]: '%\\%%' } }, { description: { [Op.iLike]: '%\\%%' } }],
          }),
        })
      );
    });

    it('escapes _ so it matches literally rather than acting as a wildcard', async () => {
      vi.mocked(Report.findAll).mockResolvedValue([]);

      await getInboxItems({ source: 'moderation', search: 'a_b' });

      expect(Report.findAll).toHaveBeenCalledWith(
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
      vi.mocked(Report.findAll).mockResolvedValue([]);

      await getInboxItems({ source: 'moderation' });

      const call = vi.mocked(Report.findAll).mock.calls[0][0] as { where: Record<symbol, unknown> };
      expect(call.where[Op.or]).toBeUndefined();
    });
  });

  describe('support ticket search', () => {
    it('passes a plain search term as-is in the LIKE pattern', async () => {
      vi.mocked(SupportTicket.findAll).mockResolvedValue([]);

      await getInboxItems({ source: 'support', search: 'login' });

      expect(SupportTicket.findAll).toHaveBeenCalledWith(
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
      vi.mocked(SupportTicket.findAll).mockResolvedValue([]);

      await getInboxItems({ source: 'support', search: '%' });

      expect(SupportTicket.findAll).toHaveBeenCalledWith(
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
      vi.mocked(SupportTicket.findAll).mockResolvedValue([]);

      await getInboxItems({ source: 'support', search: 'foo_bar' });

      expect(SupportTicket.findAll).toHaveBeenCalledWith(
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
      vi.mocked(SupportTicket.findAll).mockResolvedValue([]);

      await getInboxItems({ source: 'support' });

      const call = vi.mocked(SupportTicket.findAll).mock.calls[0][0] as {
        where: Record<symbol, unknown>;
      };
      expect(call.where[Op.or]).toBeUndefined();
    });
  });
});
