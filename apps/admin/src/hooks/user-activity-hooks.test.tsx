import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockBulkUpdateUsers = vi.fn();
const mockSuspendUser = vi.fn();
const mockUnsuspendUser = vi.fn();
const mockVerifyUser = vi.fn();
const mockGetActivity = vi.fn();

vi.mock('../services/userManagementService', () => ({
  userManagementService: {
    getUsers: (...args: unknown[]) => mockGetUsers(...args),
    createUser: (...args: unknown[]) => mockCreateUser(...args),
    deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
    bulkUpdateUsers: (...args: unknown[]) => mockBulkUpdateUsers(...args),
    suspendUser: (...args: unknown[]) => mockSuspendUser(...args),
    unsuspendUser: (...args: unknown[]) => mockUnsuspendUser(...args),
    verifyUser: (...args: unknown[]) => mockVerifyUser(...args),
  },
}));

vi.mock('../services/entityActivityService', () => ({
  entityActivityService: {
    getActivity: (...args: unknown[]) => mockGetActivity(...args),
  },
}));

import {
  useUsers,
  useCreateUser,
  useDeleteUser,
  useBulkUpdateUsers,
  useSuspendUser,
  useUnsuspendUser,
  useVerifyUser,
} from './useUsers';
import { useEntityActivity } from './useEntityActivity';

// ── Helpers ──────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useUsers', () => {
  it('fetches users with the given filters', async () => {
    const response = {
      data: [{ userId: 'u1' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    mockGetUsers.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useUsers({ status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetUsers).toHaveBeenCalledWith({ status: 'active' });
    expect(result.current.data).toEqual(response);
  });
});

describe('useCreateUser', () => {
  it('creates a user through the service', async () => {
    mockCreateUser.mockResolvedValueOnce({ userId: 'u2' });

    const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });

    result.current.mutate({
      email: 'sam@example.com',
      first_name: 'Sam',
      last_name: 'Lee',
      role: 'adopter',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'sam@example.com',
      first_name: 'Sam',
      last_name: 'Lee',
      role: 'adopter',
    });
  });
});

describe('useDeleteUser', () => {
  it('deletes a user given a plain id', async () => {
    mockDeleteUser.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });

    result.current.mutate('u1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteUser).toHaveBeenCalledWith('u1', undefined);
  });

  it('deletes a user given an object with a reason', async () => {
    mockDeleteUser.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });

    result.current.mutate({ userId: 'u3', reason: 'spam' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteUser).toHaveBeenCalledWith('u3', 'spam');
  });
});

describe('useBulkUpdateUsers', () => {
  it('passes the ids, update data and reason to the service', async () => {
    mockBulkUpdateUsers.mockResolvedValueOnce({ updatedCount: 2 });

    const { result } = renderHook(() => useBulkUpdateUsers(), { wrapper: createWrapper() });

    result.current.mutate({
      userIds: ['u1', 'u2'],
      updateData: { status: 'inactive' },
      reason: 'cleanup',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockBulkUpdateUsers).toHaveBeenCalledWith(
      ['u1', 'u2'],
      { status: 'inactive' },
      'cleanup'
    );
  });
});

describe('useSuspendUser', () => {
  it('suspends a user with a reason', async () => {
    mockSuspendUser.mockResolvedValueOnce({ userId: 'u1' });

    const { result } = renderHook(() => useSuspendUser(), { wrapper: createWrapper() });

    result.current.mutate({ userId: 'u1', reason: 'abuse' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSuspendUser).toHaveBeenCalledWith('u1', 'abuse');
  });
});

describe('useUnsuspendUser', () => {
  it('unsuspends a user', async () => {
    mockUnsuspendUser.mockResolvedValueOnce({ userId: 'u1' });

    const { result } = renderHook(() => useUnsuspendUser(), { wrapper: createWrapper() });

    result.current.mutate('u1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUnsuspendUser).toHaveBeenCalledWith('u1');
  });
});

describe('useVerifyUser', () => {
  it('verifies a user', async () => {
    mockVerifyUser.mockResolvedValueOnce({ userId: 'u1' });

    const { result } = renderHook(() => useVerifyUser(), { wrapper: createWrapper() });

    result.current.mutate('u1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockVerifyUser).toHaveBeenCalledWith('u1');
  });
});

describe('useEntityActivity', () => {
  it('fetches activity for an entity', async () => {
    const activity = { items: [{ id: 'log-1' }] };
    mockGetActivity.mockResolvedValueOnce(activity);

    const { result } = renderHook(() => useEntityActivity('user', 'u1', { limit: 25 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetActivity).toHaveBeenCalledWith('user', 'u1', { limit: 25 });
    expect(result.current.data).toEqual(activity);
  });

  it('is disabled when no entity id is provided', () => {
    const { result } = renderHook(() => useEntityActivity('user', ''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetActivity).not.toHaveBeenCalled();
  });
});
