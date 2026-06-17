import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetItems = vi.fn();
const mockAssign = vi.fn();
const mockGetAllPets = vi.fn();
const mockBulkUpdatePets = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../services/inboxService', () => ({
  inboxService: {
    getItems: (...args: unknown[]) => mockGetItems(...args),
    assign: (...args: unknown[]) => mockAssign(...args),
  },
}));

vi.mock('../services/petService', () => ({
  petService: {
    getAll: (...args: unknown[]) => mockGetAllPets(...args),
    bulkUpdate: (...args: unknown[]) => mockBulkUpdatePets(...args),
  },
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useInbox, useInboxAssign } from './useInbox';
import { useMyInboxCount } from './useMyInboxCount';
import { usePets, useBulkUpdatePets } from './usePets';

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

describe('useInbox', () => {
  it('fetches inbox items for the given filters', async () => {
    const response = {
      data: [{ id: 'i1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    mockGetItems.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useInbox({ source: 'support' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetItems).toHaveBeenCalledWith({ source: 'support' });
    expect(result.current.data).toEqual(response);
  });
});

describe('useInboxAssign', () => {
  it('assigns an item via the service', async () => {
    mockAssign.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useInboxAssign(), { wrapper: createWrapper() });

    result.current.mutate({ itemId: 'i1', source: 'moderation', assignedTo: 'admin-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAssign).toHaveBeenCalledWith('i1', 'moderation', 'admin-1');
  });
});

describe('useMyInboxCount', () => {
  it('returns the assigned-item total for the signed-in admin', async () => {
    mockUseAuth.mockReturnValue({ user: { userId: 'admin-9' } });
    mockGetItems.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 1, total: 7, totalPages: 7 },
    });

    const { result } = renderHook(() => useMyInboxCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.count).toBe(7));
    expect(mockGetItems).toHaveBeenCalledWith({ assignedTo: 'admin-9', limit: 1, page: 1 });
  });

  it('returns zero and does not query when there is no signed-in user', () => {
    mockUseAuth.mockReturnValue({ user: undefined });

    const { result } = renderHook(() => useMyInboxCount(), { wrapper: createWrapper() });

    expect(result.current.count).toBe(0);
    expect(mockGetItems).not.toHaveBeenCalled();
  });
});

describe('usePets', () => {
  it('fetches pets for the given filters', async () => {
    const response = {
      data: [{ petId: 'p1' }],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    };
    mockGetAllPets.mockResolvedValueOnce(response);

    const { result } = renderHook(() => usePets({ status: 'available' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetAllPets).toHaveBeenCalledWith({ status: 'available' });
    expect(result.current.data).toEqual(response);
  });
});

describe('useBulkUpdatePets', () => {
  it('runs a bulk update through the service', async () => {
    mockBulkUpdatePets.mockResolvedValueOnce({ successCount: 1, failedCount: 0, errors: [] });

    const { result } = renderHook(() => useBulkUpdatePets(), { wrapper: createWrapper() });

    result.current.mutate({
      petIds: ['p1'],
      operation: 'archive',
      data: { archived: true },
      reason: 'cleanup',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockBulkUpdatePets).toHaveBeenCalledWith(
      ['p1'],
      'archive',
      { archived: true },
      'cleanup'
    );
  });
});
