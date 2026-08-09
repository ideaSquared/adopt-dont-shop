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
        data: [],
        pagination: { page: 2, limit: 50, total: 0, pages: 0 },
      });

      await petService.getAll({
        search: 'rex',
        status: 'available',
        rescueId: 'r1',
        type: 'dog',
        page: 2,
        limit: 50,
      });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/pets', {
        search: 'rex',
        status: 'available',
        rescueId: 'r1',
        type: 'dog',
        page: '2',
        limit: '50',
      });
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

    it('transforms the snake_case pet view into camelCase AdminPet', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [
          {
            pet_id: 'p1',
            name: 'Rex',
            type: 'dog',
            breed: 'Labrador',
            status: 'available',
            rescue_id: 'r1',
            archived: false,
            featured: true,
            created_at: '2024-01-01',
            updated_at: '2024-01-02',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });

      const result = await petService.getAll();

      expect(result.data).toEqual([
        {
          petId: 'p1',
          name: 'Rex',
          type: 'dog',
          breed: 'Labrador',
          status: 'available',
          rescueId: 'r1',
          rescueName: undefined,
          archived: false,
          featured: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
        },
      ]);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
    });

    it('defaults fields the pet view omits', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [{ pet_id: 'p2', name: 'Milo', created_at: '2024-02-01', updated_at: '2024-02-02' }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });

      const result = await petService.getAll();

      expect(result.data[0]).toEqual({
        petId: 'p2',
        name: 'Milo',
        type: '',
        breed: '',
        status: 'not_available',
        rescueId: '',
        rescueName: undefined,
        archived: false,
        featured: false,
        createdAt: '2024-02-01',
        updatedAt: '2024-02-02',
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
