/**
 * NotificationsProvider — unread badge
 *
 * The badge counts every unread notification the user has, not just the page
 * of notifications loaded so far, and refreshes after marking one read.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsProvider, useNotifications } from '../NotificationsContext';

const getUserNotificationsMock = vi.fn();
const getUnreadCountMock = vi.fn();

vi.mock('@adopt-dont-shop/lib.notifications', () => {
  class NotificationsService {
    getUserNotifications = getUserNotificationsMock;
    getUnreadCount = getUnreadCountMock;
    markAsRead = vi.fn(async () => undefined);
    markAllAsRead = vi.fn(async () => undefined);
    deleteNotification = vi.fn(async () => undefined);
  }
  return { NotificationsService };
});

const unread = (id: string) => ({
  id,
  userId: 'u-1',
  title: `Notification ${id}`,
  message: 'Message',
  createdAt: new Date().toISOString(),
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

describe('NotificationsProvider unread badge', () => {
  beforeEach(() => {
    getUserNotificationsMock.mockReset();
    getUnreadCountMock.mockReset();
    getUserNotificationsMock.mockResolvedValue({
      data: [unread('n-1'), unread('n-2')],
      pagination: { page: 1, limit: 20, total: 42, totalPages: 3, hasNext: true, hasPrev: false },
    });
  });

  it('counts every unread notification, not just the loaded page', async () => {
    getUnreadCountMock.mockResolvedValue({ data: { count: 42 } });
    const { getCtx } = renderWithProvider();

    await waitFor(() => expect(getCtx().unreadCount).toBe(42));
  });

  it('refreshes the count after a notification is marked read', async () => {
    getUnreadCountMock
      .mockResolvedValueOnce({ data: { count: 42 } })
      .mockResolvedValue({ data: { count: 41 } });
    const { getCtx } = renderWithProvider();
    await waitFor(() => expect(getCtx().unreadCount).toBe(42));

    await act(async () => {
      await getCtx().markAsRead('n-1');
    });

    await waitFor(() => expect(getCtx().unreadCount).toBe(41));
  });

  it('falls back to the loaded unread notifications when the count is unavailable', async () => {
    getUnreadCountMock.mockRejectedValue(new Error('down'));
    const { getCtx } = renderWithProvider();

    await waitFor(() => expect(getCtx().notifications).toHaveLength(2));
    expect(getCtx().unreadCount).toBe(2);
  });
});
