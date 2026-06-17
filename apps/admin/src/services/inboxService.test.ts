import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { inboxService } from './inboxService';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('inboxService', () => {
  describe('getItems', () => {
    it('forwards the provided filters to the inbox endpoint', async () => {
      const response = {
        data: [{ id: 'i1', source: 'support' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockGet.mockResolvedValueOnce(response);

      const result = await inboxService.getItems({
        source: 'support',
        status: 'open',
        page: 1,
      });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/inbox', {
        source: 'support',
        status: 'open',
        page: 1,
      });
      expect(result).toEqual(response);
    });

    it('defaults to no filters', async () => {
      mockGet.mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await inboxService.getItems();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/inbox', {});
    });
  });

  describe('assign', () => {
    it('posts the assignment to the assign endpoint', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      await inboxService.assign('i1', 'moderation', 'admin-1');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/inbox/assign', {
        itemId: 'i1',
        source: 'moderation',
        assignedTo: 'admin-1',
      });
    });
  });
});
