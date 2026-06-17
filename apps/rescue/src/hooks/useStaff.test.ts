import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StaffMember } from '../services/staffService';

const authState = vi.hoisted(() => ({
  current: { user: { userId: 'u1' } as { userId?: string } | null },
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => authState.current,
}));

const staffServiceMock = vi.hoisted(() => ({
  getRescueStaff: vi.fn<() => Promise<StaffMember[]>>(),
  addStaffMember: vi.fn(),
  removeStaffMember: vi.fn(),
  updateStaffMember: vi.fn(),
}));

vi.mock('../services/staffService', () => ({
  staffService: staffServiceMock,
}));

import { useStaff } from './useStaff';

const member = (overrides: Partial<StaffMember> = {}): StaffMember => ({
  id: 's1',
  userId: 'su1',
  rescueId: 'r1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah@rescue.org',
  title: 'Manager',
  isVerified: true,
  addedAt: '2024-01-01',
  ...overrides,
});

/**
 * Behaviour tests for the useStaff hook used by the staff management page.
 * It loads colleagues for the signed-in user's rescue, and exposes mutations
 * that optimistically update the local list.
 */
describe('useStaff', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authState.current = { user: { userId: 'u1' } };
    staffServiceMock.getRescueStaff.mockResolvedValue([member()]);
  });

  it('loads staff for the signed-in user', async () => {
    const { result } = renderHook(() => useStaff());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(staffServiceMock.getRescueStaff).toHaveBeenCalled();
    expect(result.current.staff).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch and clears staff when there is no signed-in user', async () => {
    authState.current = { user: null };

    const { result } = renderHook(() => useStaff());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(staffServiceMock.getRescueStaff).not.toHaveBeenCalled();
    expect(result.current.staff).toEqual([]);
  });

  it('surfaces an error message when loading fails', async () => {
    staffServiceMock.getRescueStaff.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useStaff());

    await waitFor(() => expect(result.current.error).toBe('Failed to load staff members'));
    expect(result.current.staff).toEqual([]);
  });

  it('adds a staff member to the list', async () => {
    const { result } = renderHook(() => useStaff());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const added = member({ id: 's2', userId: 'su2', firstName: 'New' });
    staffServiceMock.addStaffMember.mockResolvedValue(added);

    await act(async () => {
      await result.current.addStaffMember({ email: 'new@x.com' } as never, 'r1');
    });

    expect(staffServiceMock.addStaffMember).toHaveBeenCalledWith({ email: 'new@x.com' }, 'r1');
    expect(result.current.staff.map(s => s.firstName)).toContain('New');
  });

  it('removes a staff member from the list', async () => {
    staffServiceMock.getRescueStaff.mockResolvedValue([
      member({ userId: 'keep' }),
      member({ id: 's2', userId: 'drop' }),
    ]);
    staffServiceMock.removeStaffMember.mockResolvedValue(undefined);

    const { result } = renderHook(() => useStaff());
    await waitFor(() => expect(result.current.staff).toHaveLength(2));

    await act(async () => {
      await result.current.removeStaffMember('drop', 'r1');
    });

    expect(result.current.staff.map(s => s.userId)).toEqual(['keep']);
  });

  it('updates a staff member in place', async () => {
    staffServiceMock.getRescueStaff.mockResolvedValue([member({ userId: 'su1', title: 'Old' })]);
    staffServiceMock.updateStaffMember.mockResolvedValue(member({ userId: 'su1', title: 'Lead' }));

    const { result } = renderHook(() => useStaff());
    await waitFor(() => expect(result.current.staff).toHaveLength(1));

    await act(async () => {
      await result.current.updateStaffMember('su1', { title: 'Lead' }, 'r1');
    });

    expect(result.current.staff[0].title).toBe('Lead');
  });

  it('refetches the staff list on demand', async () => {
    const { result } = renderHook(() => useStaff());
    await waitFor(() => expect(result.current.loading).toBe(false));

    staffServiceMock.getRescueStaff.mockResolvedValue([member({ firstName: 'Refetched' })]);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.staff[0].firstName).toBe('Refetched');
  });
});
