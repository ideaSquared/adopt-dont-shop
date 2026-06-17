import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { applicationService } from './applicationService';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('applicationService', () => {
  describe('getAll', () => {
    it('maps filters to params and normalises backend applications', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'a1',
            status: 'submitted',
            petId: 'p1',
            petName: 'Rex',
            petType: 'dog',
            rescueId: 'r1',
            rescueName: 'Paws',
            userName: 'Jane',
            userEmail: 'jane@example.com',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-02',
          },
        ],
        pagination: { page: 2, limit: 30, total: 1, pages: 1 },
      });

      const result = await applicationService.getAll({
        search: 'rex',
        status: 'submitted',
        rescueId: 'r1',
        petType: 'dog',
        page: 2,
        limit: 30,
      });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/applications', {
        search: 'rex',
        status: 'submitted',
        rescueId: 'r1',
        petType: 'dog',
        page: '2',
        limit: '30',
      });
      expect(result.data).toEqual([
        {
          applicationId: 'a1',
          status: 'submitted',
          petId: 'p1',
          petName: 'Rex',
          petType: 'dog',
          rescueId: 'r1',
          rescueName: 'Paws',
          applicantName: 'Jane',
          applicantEmail: 'jane@example.com',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
        },
      ]);
      expect(result.pagination).toEqual({ page: 2, limit: 30, total: 1, pages: 1 });
    });

    it('defaults missing applicant/pet/rescue fields to empty strings', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'a2',
            status: 'submitted',
            petId: 'p2',
            rescueId: 'r2',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-02',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });

      const result = await applicationService.getAll();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/applications', { limit: '20' });
      expect(result.data[0]).toMatchObject({
        petName: '',
        rescueName: '',
        applicantName: '',
        applicantEmail: '',
      });
    });
  });

  describe('bulkUpdate', () => {
    it('patches the updates and returns the updated count', async () => {
      mockPatch.mockResolvedValueOnce({ success: true, message: '', data: { updatedCount: 4 } });

      const result = await applicationService.bulkUpdate(
        ['a1', 'a2'],
        { status: 'approved', reviewNotes: 'ok' },
        'batch review'
      );

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/applications/bulk-update', {
        applicationIds: ['a1', 'a2'],
        updates: { status: 'approved', reviewNotes: 'ok' },
        reason: 'batch review',
      });
      expect(result).toEqual({ updatedCount: 4 });
    });

    it('throws the server message on failure', async () => {
      mockPatch.mockResolvedValueOnce({ success: false, message: 'cannot update', data: null });

      await expect(applicationService.bulkUpdate(['a1'], { status: 'rejected' })).rejects.toThrow(
        'cannot update'
      );
    });
  });
});
