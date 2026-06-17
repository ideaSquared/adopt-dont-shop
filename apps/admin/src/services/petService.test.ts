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

import { petService } from './petService';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('PetService', () => {
  describe('getAll', () => {
    it('maps all provided filters into query params', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [{ petId: 'p1' }],
        pagination: { page: 2, limit: 50, total: 1, pages: 1 },
      });

      const result = await petService.getAll({
        search: 'rex',
        status: 'available',
        rescueId: 'r1',
        archived: true,
        type: 'dog',
        page: 2,
        limit: 50,
      });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/pets', {
        search: 'rex',
        status: 'available',
        rescueId: 'r1',
        includeArchived: 'true',
        type: 'dog',
        page: '2',
        limit: '50',
      });
      expect(result.data).toEqual([{ petId: 'p1' }]);
      expect(result.pagination).toEqual({ page: 2, limit: 50, total: 1, pages: 1 });
    });

    it('defaults the limit to 20 and omits unset filters', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });

      await petService.getAll();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/pets', { limit: '20' });
    });

    it('serialises archived=false explicitly', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });

      await petService.getAll({ archived: false });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/pets', {
        includeArchived: 'false',
        limit: '20',
      });
    });
  });

  describe('bulkUpdate', () => {
    it('posts the operation payload and returns the result', async () => {
      const data = { successCount: 3, failedCount: 0, errors: [] };
      mockPost.mockResolvedValueOnce({ success: true, message: '', data });

      const result = await petService.bulkUpdate(
        ['p1', 'p2', 'p3'],
        'update_status',
        { status: 'adopted' },
        'cleanup'
      );

      expect(mockPost).toHaveBeenCalledWith('/api/v1/pets/bulk-update', {
        petIds: ['p1', 'p2', 'p3'],
        operation: 'update_status',
        data: { status: 'adopted' },
        reason: 'cleanup',
      });
      expect(result).toEqual(data);
    });

    it('throws the server message when unsuccessful', async () => {
      mockPost.mockResolvedValueOnce({ success: false, message: 'bulk boom', data: null });

      await expect(petService.bulkUpdate(['p1'], 'archive')).rejects.toThrow('bulk boom');
    });

    it('throws a default message when none is returned', async () => {
      mockPost.mockResolvedValueOnce({ success: false, message: '', data: null });

      await expect(petService.bulkUpdate(['p1'], 'delete')).rejects.toThrow(
        'Failed to bulk update pets'
      );
    });
  });
});
