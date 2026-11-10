/**
 * NotificationsProvider — load more
 *
 * The gateway pages notifications. The provider shows the first page and fetches the next one on
 * request until the gateway reports there are no more.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsProvider, useNotifications } from '../NotificationsContext';

const getUserNotificationsMock = vi.fn();

vi.mock('@adopt-dont-shop/lib.notifications', () => {
  class NotificationsService {
    getUserNotifications = getUserNotificationsMock;
    markAsRead = vi.fn(async () => undefined);
    markAllAsRead = vi.fn(async () => undefined);
    deleteNotification = vi.fn(async () => undefined);
  }
  return { NotificationsService };
});

const notification = (id: string) => ({
  id,
  userId: 'u-1',
  title: `Notification ${id}`,
  message: 'Message',
  createdAt: new Date().toISOString(),
});

const page = (ids: string[], pageNumber: number, hasNext: boolean) => ({
  data: ids.map(notification),
  pagination: { page: pageNumber, limit: 20, total: 3, totalPages: 2, hasNext, hasPrev: false },
});

const TestConsumer: React.FC<{ onContext: (ctx: ReturnType<typeof useNotifications>) => void }> = ({
  onContext,
}) => {
  onContext(useNotifications());
  return null;
};

const renderWithProvider = () => {
  let capturedCtx: ReturnType<typeof useNotifications> | null = null;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider userId='u-1'>
        <TestConsumer
          onContext={ctx => {
            capturedCtx = ctx;
          }}
        />
      </NotificationsProvider>
    </QueryClientProvider>
  );
  return { getCtx: () => capturedCtx! };
};

describe('NotificationsProvider load more', () => {
  beforeEach(() => {
    getUserNotificationsMock.mockReset();
    getUserNotificationsMock
      .mockResolvedValueOnce(page(['n-1', 'n-2'], 1, true))
      .mockResolvedValueOnce(page(['n-3'], 2, false));
  });

  it('appends the next page when more notifications are requested', async () => {
    const { getCtx } = renderWithProvider();
    await waitFor(() => expect(getCtx().notifications).toHaveLength(2));
    expect(getCtx().hasMore).toBe(true);

    await act(async () => {
      await getCtx().loadMore();
    });

    await waitFor(() =>
      expect(getCtx().notifications.map(n => n.id)).toEqual(['n-1', 'n-2', 'n-3'])
    );
    expect(getUserNotificationsMock).toHaveBeenLastCalledWith('u-1', { page: 2 });
    expect(getCtx().hasMore).toBe(false);
  });
});
