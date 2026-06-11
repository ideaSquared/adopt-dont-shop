/**
 * NotificationsProvider clearAll — server-side delete
 *
 * clearAll must delete every notification server-side (not just clear local
 * state) and restore state if the server call fails.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, act } from '@testing-library/react';
import { NotificationsProvider, useNotifications } from '../NotificationsContext';

const deleteNotificationMock = vi.fn();
const getUserNotificationsMock = vi.fn();

vi.mock('@adopt-dont-shop/lib.notifications', () => {
  class NotificationsService {
    getUserNotifications = getUserNotificationsMock;
    markAsRead = vi.fn(async () => undefined);
    markAllAsRead = vi.fn(async () => undefined);
    deleteNotification = (...args: unknown[]) => deleteNotificationMock(...args);
  }
  return { NotificationsService };
});

const makeNotification = (id: string) => ({
  id,
  title: `Notification ${id}`,
  message: 'Message',
  createdAt: new Date().toISOString(),
  readAt: null,
  type: 'system' as const,
  userId: 'u-1',
});

const TestConsumer: React.FC<{ onContext: (ctx: ReturnType<typeof useNotifications>) => void }> = ({
  onContext,
}) => {
  const ctx = useNotifications();
  onContext(ctx);
  return null;
};

const renderWithProvider = (userId = 'u-1') => {
  let capturedCtx: ReturnType<typeof useNotifications> | null = null;
  render(
    <MemoryRouter>
      <NotificationsProvider userId={userId}>
        <TestConsumer
          onContext={ctx => {
            capturedCtx = ctx;
          }}
        />
      </NotificationsProvider>
    </MemoryRouter>
  );
  return { getCtx: () => capturedCtx! };
};

describe('NotificationsProvider clearAll server-side delete', () => {
  beforeEach(() => {
    deleteNotificationMock.mockReset();
    getUserNotificationsMock.mockReset();
    getUserNotificationsMock.mockResolvedValue({
      data: [makeNotification('n-1'), makeNotification('n-2')],
    });
    deleteNotificationMock.mockResolvedValue(undefined);
  });

  it('calls deleteNotification for each notification when clearAll is invoked', async () => {
    const { getCtx } = renderWithProvider();

    // Wait for notifications to load
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await getCtx().clearAll('u-1');
    });

    expect(deleteNotificationMock).toHaveBeenCalledTimes(2);
    expect(deleteNotificationMock).toHaveBeenCalledWith('n-1');
    expect(deleteNotificationMock).toHaveBeenCalledWith('n-2');
  });

  it('restores notifications when the server delete fails', async () => {
    deleteNotificationMock.mockRejectedValue(new Error('server error'));
    const { getCtx } = renderWithProvider();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      try {
        await getCtx().clearAll('u-1');
      } catch {
        // expected to throw
      }
    });

    // After failure the state should be restored to the loaded notifications
    expect(getCtx().notifications).toHaveLength(2);
  });
});
