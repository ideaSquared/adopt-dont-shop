import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiServiceMock = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<unknown>>(),
  post: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  put: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  delete: vi.fn<(url: string) => Promise<unknown>>(),
}));

vi.mock('./libraryServices', () => ({
  apiService: apiServiceMock,
}));

import { RescueStaffService } from './staffService';

/**
 * Behaviour tests for the rescue staff service. Staff management is a core
 * rescue journey: colleagues are listed, invited, edited and removed. The
 * service must normalise the backend's mixed camelCase / snake_case shapes so
 * the UI always sees a consistent StaffMember.
 */
describe('RescueStaffService', () => {
  const service = new RescueStaffService();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getRescueStaff', () => {
    it('requests colleagues for the current rescue and normalises camelCase rows', async () => {
      apiServiceMock.get.mockResolvedValue({
        success: true,
        data: [
          {
            id: 's1',
            userId: 'u1',
            rescueId: 'r1',
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah@rescue.org',
            title: 'Manager',
            isVerified: true,
            addedAt: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const result = await service.getRescueStaff();

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/staff/colleagues');
      expect(result).toEqual([
        {
          id: 's1',
          userId: 'u1',
          rescueId: 'r1',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah@rescue.org',
          title: 'Manager',
          isVerified: true,
          addedAt: '2024-01-01T00:00:00Z',
        },
      ]);
    });

    it('normalises snake_case rows and nested user details', async () => {
      apiServiceMock.get.mockResolvedValue({
        success: true,
        data: [
          {
            staffId: 's2',
            user_id: 'u2',
            rescue_id: 'r2',
            is_verified: false,
            created_at: '2024-02-02T00:00:00Z',
            user: { firstName: 'Bob', lastName: 'Lee', email: 'bob@rescue.org' },
          },
        ],
      });

      const [member] = await service.getRescueStaff();

      expect(member.id).toBe('s2');
      expect(member.userId).toBe('u2');
      expect(member.rescueId).toBe('r2');
      expect(member.firstName).toBe('Bob');
      expect(member.lastName).toBe('Lee');
      expect(member.email).toBe('bob@rescue.org');
      expect(member.isVerified).toBe(false);
      expect(member.addedAt).toBe('2024-02-02T00:00:00Z');
    });

    it('applies sensible defaults for missing names and title', async () => {
      apiServiceMock.get.mockResolvedValue({ success: true, data: [{ id: 's3' }] });

      const [member] = await service.getRescueStaff();

      expect(member.firstName).toBe('Unknown');
      expect(member.lastName).toBe('User');
      expect(member.title).toBe('Staff Member');
      expect(member.isVerified).toBe(false);
    });

    it('accepts a bare array response shape', async () => {
      apiServiceMock.get.mockResolvedValue([{ id: 's4', firstName: 'Amy' }]);

      const result = await service.getRescueStaff();

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Amy');
    });

    it('returns an empty array when the request fails rather than throwing', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('network down'));

      await expect(service.getRescueStaff()).resolves.toEqual([]);
    });
  });

  describe('addStaffMember', () => {
    it('posts the new staff payload to the rescue staff endpoint', async () => {
      apiServiceMock.post.mockResolvedValue({
        success: true,
        data: { id: 's5', firstName: 'New', lastName: 'Hire', email: 'new@rescue.org' },
      });

      const result = await service.addStaffMember(
        { email: 'new@rescue.org', title: 'Volunteer' } as never,
        'r1'
      );

      expect(apiServiceMock.post).toHaveBeenCalledWith('/api/v1/rescues/r1/staff', {
        email: 'new@rescue.org',
        title: 'Volunteer',
      });
      expect(result.firstName).toBe('New');
    });

    it('throws when the response has no data', async () => {
      apiServiceMock.post.mockResolvedValue({ success: true });

      await expect(service.addStaffMember({} as never, 'r1')).rejects.toThrow(
        'Invalid response format'
      );
    });

    it('propagates request errors', async () => {
      apiServiceMock.post.mockRejectedValue(new Error('boom'));

      await expect(service.addStaffMember({} as never, 'r1')).rejects.toThrow('boom');
    });
  });

  describe('removeStaffMember', () => {
    it('deletes the staff member from the rescue', async () => {
      apiServiceMock.delete.mockResolvedValue(undefined);

      await service.removeStaffMember('u9', 'r1');

      expect(apiServiceMock.delete).toHaveBeenCalledWith('/api/v1/rescues/r1/staff/u9');
    });

    it('propagates deletion errors', async () => {
      apiServiceMock.delete.mockRejectedValue(new Error('forbidden'));

      await expect(service.removeStaffMember('u9', 'r1')).rejects.toThrow('forbidden');
    });
  });

  describe('updateStaffMember', () => {
    it('puts the updated title and returns the normalised member', async () => {
      apiServiceMock.put.mockResolvedValue({
        success: true,
        data: { id: 's1', title: 'Lead' },
      });

      const result = await service.updateStaffMember('u1', { title: 'Lead' }, 'r1');

      expect(apiServiceMock.put).toHaveBeenCalledWith('/api/v1/rescues/r1/staff/u1', {
        title: 'Lead',
      });
      expect(result.title).toBe('Lead');
    });

    it('throws when the update response is empty', async () => {
      apiServiceMock.put.mockResolvedValue({ success: false });

      await expect(service.updateStaffMember('u1', { title: 'x' }, 'r1')).rejects.toThrow(
        'Invalid response format'
      );
    });
  });
});
