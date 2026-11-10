/**
 * NotificationsProvider — gateway wire shape
 *
 * The gateway lists notifications as the proto JSON: the id is `notificationId` and there is no
 * `actionUrl`, only `relatedEntityType` / `relatedEntityId`. Opening a notification must mark the
 * right one read and link to the thing it is about.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsProvider, useNotifications } from '../NotificationsContext';

const getUserNotificationsMock = vi.fn();
const markAsReadMock = vi.fn();

vi.mock('@adopt-dont-shop/lib.notifications', () => {
  class NotificationsService {
    getUserNotifications = getUserNotificationsMock;
    markAsRead = (...args: unknown[]) => markAsReadMock(...args);
    markAllAsRead = vi.fn(async () => undefined);
    deleteNotification = vi.fn(async () => undefined);
  }
  return { NotificationsService };
});

const wireNotification = (
  notificationId: string,
  relatedEntityType?: string,
  relatedEntityId?: string
) => ({
  notificationId,
  userId: 'u-1',
  title: `Notification ${notificationId}`,
  message: 'Message',
  createdAt: new Date().toISOString(),
  relatedEntityType,
  relatedEntityId,
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

describe('NotificationsProvider with the gateway wire shape', () => {
  beforeEach(() => {
    markAsReadMock.mockReset();
    markAsReadMock.mockResolvedValue(undefined);
    getUserNotificationsMock.mockReset();
    getUserNotificationsMock.mockResolvedValue({
      data: [
        wireNotification('n-app', 'NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION', 'app-1'),
        wireNotification('n-pet', 'NOTIFICATION_RELATED_ENTITY_TYPE_PET', 'pet-1'),
        wireNotification('n-chat', 'NOTIFICATION_RELATED_ENTITY_TYPE_CONVERSATION', 'conv-1'),
        wireNotification('n-plain'),
      ],
    });
  });

  it('marks the opened notification read by its gateway id', async () => {
    const { getCtx } = renderWithProvider();
    await waitFor(() => expect(getCtx().notifications).toHaveLength(4));

    await act(async () => {
      await getCtx().markAsRead(getCtx().notifications[0].id);
    });

    expect(markAsReadMock).toHaveBeenCalledWith(['n-app']);
  });

  it('links each notification to the application, pet or conversation it is about', async () => {
    const { getCtx } = renderWithProvider();
    await waitFor(() => expect(getCtx().notifications).toHaveLength(4));

    expect(getCtx().notifications.map(n => n.actionUrl)).toEqual([
      '/applications/app-1',
      '/pets/pet-1',
      '/chat/conv-1',
      undefined,
    ]);
  });
});
