import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import { rescueService } from './rescueService';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

const pagination = (overrides = {}) => ({
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
  ...overrides,
});

describe('AdminRescueService', () => {
  describe('getAll', () => {
    it('translates filters into query params and computes pagination flags', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [{ rescueId: 'r1' }],
        pagination: { page: 2, limit: 10, total: 30, totalPages: 3 },
      });

      const result = await rescueService.getAll({
        page: 2,
        limit: 10,
        search: 'paws',
        status: 'pending',
        state: 'CA',
        sortBy: 'name',
        sortOrder: 'asc',
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
      });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/rescues', {
        page: '2',
        limit: '10',
        search: 'paws',
        status: 'pending',
        location: 'CA',
        sortBy: 'name',
        sortOrder: 'ASC',
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
      });
      expect(result.data).toEqual([{ rescueId: 'r1' }]);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 30,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('falls back to pages when totalPages is absent and sends empty params by default', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 5 },
      });

      const result = await rescueService.getAll();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/rescues', {});
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('throws when the response is unsuccessful', async () => {
      mockGet.mockResolvedValueOnce({ success: false, data: [], pagination: pagination() });

      await expect(rescueService.getAll()).rejects.toThrow('Failed to fetch rescues');
    });
  });

  describe('getById', () => {
    it('requests stats when includeStats is set', async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: { rescueId: 'r1' } });

      const result = await rescueService.getById('r1', { includeStats: true });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/rescues/r1', { includeStats: 'true' });
      expect(result).toEqual({ rescueId: 'r1' });
    });

    it('throws when unsuccessful', async () => {
      mockGet.mockResolvedValueOnce({ success: false, data: null });

      await expect(rescueService.getById('r1')).rejects.toThrow('Failed to fetch rescue');
    });
  });

  describe('verify', () => {
    it('posts verification notes', async () => {
      mockPost.mockResolvedValueOnce({ success: true, message: '', data: { rescueId: 'r1' } });

      const result = await rescueService.verify('r1', {
        status: 'verified',
        notes: 'looks good',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/rescues/r1/verify', { notes: 'looks good' });
      expect(result).toEqual({ rescueId: 'r1' });
    });

    it('throws the server message on failure', async () => {
      mockPost.mockResolvedValueOnce({ success: false, message: 'nope', data: null });

      await expect(rescueService.verify('r1', { status: 'verified', notes: 'x' })).rejects.toThrow(
        'nope'
      );
    });
  });

  describe('reject', () => {
    it('posts the rejection reason and notes', async () => {
      mockPost.mockResolvedValueOnce({ success: true, message: '', data: { rescueId: 'r1' } });

      await rescueService.reject('r1', {
        status: 'rejected',
        rejectionReason: 'incomplete',
        notes: 'n',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/rescues/r1/reject', {
        reason: 'incomplete',
        notes: 'n',
      });
    });

    it('throws a default message when none provided', async () => {
      mockPost.mockResolvedValueOnce({ success: false, message: '', data: null });

      await expect(rescueService.reject('r1', { status: 'rejected', notes: 'n' })).rejects.toThrow(
        'Failed to reject rescue'
      );
    });
  });

  describe('getStaff', () => {
    it('paginates staff members', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [{ userId: 'u1' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const result = await rescueService.getStaff('r1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/rescues/r1/staff', {
        page: '1',
        limit: '20',
      });
      expect(result.data).toEqual([{ userId: 'u1' }]);
    });

    it('throws when unsuccessful', async () => {
      mockGet.mockResolvedValueOnce({ success: false, data: [], pagination: pagination() });

      await expect(rescueService.getStaff('r1')).rejects.toThrow('Failed to fetch staff members');
    });
  });

  describe('addStaff', () => {
    it('posts the staff payload', async () => {
      mockPost.mockResolvedValueOnce({ success: true, message: '', data: { userId: 'u1' } });

      const result = await rescueService.addStaff('r1', { userId: 'u1', title: 'Volunteer' });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/rescues/r1/staff', {
        userId: 'u1',
        title: 'Volunteer',
      });
      expect(result).toEqual({ userId: 'u1' });
    });

    it('throws on failure', async () => {
      mockPost.mockResolvedValueOnce({ success: false, message: 'bad', data: null });

      await expect(
        rescueService.addStaff('r1', { userId: 'u1', title: 'Volunteer' })
      ).rejects.toThrow('bad');
    });
  });

  describe('removeStaff', () => {
    it('deletes the staff member', async () => {
      mockDelete.mockResolvedValueOnce({ success: true, message: '' });

      await rescueService.removeStaff('r1', 'u1');

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/rescues/r1/staff/u1');
    });

    it('throws on failure', async () => {
      mockDelete.mockResolvedValueOnce({ success: false, message: 'cannot' });

      await expect(rescueService.removeStaff('r1', 'u1')).rejects.toThrow('cannot');
    });
  });

  describe('getInvitations', () => {
    it('returns the invitations list', async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: [{ id: 1 }] });

      const result = await rescueService.getInvitations('r1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/rescues/r1/invitations');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('throws on failure', async () => {
      mockGet.mockResolvedValueOnce({ success: false, data: [] });

      await expect(rescueService.getInvitations('r1')).rejects.toThrow(
        'Failed to fetch invitations'
      );
    });
  });

  describe('inviteStaff', () => {
    it('posts the invitation payload', async () => {
      mockPost.mockResolvedValueOnce({ success: true, message: '', data: { id: 2 } });

      const result = await rescueService.inviteStaff('r1', {
        email: 'a@b.com',
        title: 'Volunteer',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/rescues/r1/invitations', {
        email: 'a@b.com',
        title: 'Volunteer',
      });
      expect(result).toEqual({ id: 2 });
    });

    it('throws on failure', async () => {
      mockPost.mockResolvedValueOnce({ success: false, message: 'denied', data: null });

      await expect(
        rescueService.inviteStaff('r1', { email: 'a@b.com', title: 'Volunteer' })
      ).rejects.toThrow('denied');
    });
  });

  describe('cancelInvitation', () => {
    it('deletes the invitation', async () => {
      mockDelete.mockResolvedValueOnce({ success: true, message: '' });

      await rescueService.cancelInvitation('r1', 7);

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/rescues/r1/invitations/7');
    });

    it('throws on failure', async () => {
      mockDelete.mockResolvedValueOnce({ success: false, message: 'oops' });

      await expect(rescueService.cancelInvitation('r1', 7)).rejects.toThrow('oops');
    });
  });

  describe('getAnalytics', () => {
    it('returns rescue statistics', async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: { adoptions: 5 } });

      const result = await rescueService.getAnalytics('r1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/rescues/r1/analytics');
      expect(result).toEqual({ adoptions: 5 });
    });

    it('throws on failure', async () => {
      mockGet.mockResolvedValueOnce({ success: false, data: null });

      await expect(rescueService.getAnalytics('r1')).rejects.toThrow('Failed to fetch analytics');
    });
  });

  describe('sendEmail', () => {
    it('posts the email payload', async () => {
      mockPost.mockResolvedValueOnce({ success: true, message: '' });

      await rescueService.sendEmail('r1', { subject: 'Hi', body: 'Body' });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/rescues/r1/send-email', {
        subject: 'Hi',
        body: 'Body',
      });
    });

    it('throws on failure', async () => {
      mockPost.mockResolvedValueOnce({ success: false, message: 'mail failed' });

      await expect(rescueService.sendEmail('r1', { subject: 'x', body: 'y' })).rejects.toThrow(
        'mail failed'
      );
    });
  });

  describe('delete', () => {
    it('passes a reason when provided', async () => {
      mockDelete.mockResolvedValueOnce({ success: true, message: '' });

      await rescueService.delete('r1', 'duplicate');

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/rescues/r1', { reason: 'duplicate' });
    });

    it('omits the body when no reason is given', async () => {
      mockDelete.mockResolvedValueOnce({ success: true, message: '' });

      await rescueService.delete('r1');

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/rescues/r1', undefined);
    });

    it('throws on failure', async () => {
      mockDelete.mockResolvedValueOnce({ success: false, message: 'busy' });

      await expect(rescueService.delete('r1')).rejects.toThrow('busy');
    });
  });

  describe('updatePlan', () => {
    it('patches the admin plan endpoint', async () => {
      mockPatch.mockResolvedValueOnce({ success: true, message: '', data: { rescueId: 'r1' } });

      const result = await rescueService.updatePlan('r1', {
        plan: 'professional',
        planExpiresAt: '2025-01-01',
      });

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/admin/rescues/r1/plan', {
        plan: 'professional',
        planExpiresAt: '2025-01-01',
      });
      expect(result).toEqual({ rescueId: 'r1' });
    });

    it('throws on failure', async () => {
      mockPatch.mockResolvedValueOnce({ success: false, message: 'plan error', data: null });

      await expect(rescueService.updatePlan('r1', { plan: 'professional' })).rejects.toThrow(
        'plan error'
      );
    });
  });

  describe('bulkUpdate', () => {
    it('posts the bulk action and returns counts', async () => {
      mockPost.mockResolvedValueOnce({
        success: true,
        message: '',
        data: { successCount: 2, failedCount: 1 },
      });

      const result = await rescueService.bulkUpdate(['r1', 'r2', 'r3'], 'verify', 'batch');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/rescues/bulk-update', {
        rescueIds: ['r1', 'r2', 'r3'],
        action: 'verify',
        reason: 'batch',
      });
      expect(result).toEqual({ successCount: 2, failedCount: 1 });
    });

    it('throws on failure', async () => {
      mockPost.mockResolvedValueOnce({ success: false, message: 'bulk failed', data: null });

      await expect(rescueService.bulkUpdate(['r1'], 'approve')).rejects.toThrow('bulk failed');
    });
  });
});
