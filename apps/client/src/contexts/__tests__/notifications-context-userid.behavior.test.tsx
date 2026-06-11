import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';

import { NotificationsProvider } from '../NotificationsContext';

// Hold a stable mock for getUserNotifications across renders so tests can
// assert which userId it was called with.
const getUserNotificationsMock = vi.fn(async () => ({ data: [] }));

vi.mock('@adopt-dont-shop/lib.notifications', () => {
  class NotificationsService {
    getUserNotifications = getUserNotificationsMock;
    markAsRead = vi.fn(async () => undefined);
    markAllAsRead = vi.fn(async () => undefined);
    deleteNotification = vi.fn(async () => undefined);
  }
  return { NotificationsService };
});

afterEach(() => {
  getUserNotificationsMock.mockClear();
});

const renderWithProvider = (userId?: string) =>
  render(
    <MemoryRouter>
      <NotificationsProvider userId={userId}>
        <div>child</div>
      </NotificationsProvider>
    </MemoryRouter>
  );

describe('NotificationsProvider userId wiring', () => {
  it('does not load notifications when no userId is provided', async () => {
    renderWithProvider(undefined);
    // Give the provider's effect a tick to run; it should bail out early.
    await waitFor(() => {
      // No call should have been made.
      expect(getUserNotificationsMock).not.toHaveBeenCalled();
    });
  });

  it('loads notifications for the authenticated user when userId is provided', async () => {
    renderWithProvider('user-123');
    await waitFor(() => {
      expect(getUserNotificationsMock).toHaveBeenCalledWith('user-123');
    });
  });

  it('reloads notifications when the userId changes (e.g. login or rehydrate)', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <NotificationsProvider userId={undefined}>
          <div>child</div>
        </NotificationsProvider>
      </MemoryRouter>
    );

    // Initially no userId -> no fetch.
    expect(getUserNotificationsMock).not.toHaveBeenCalled();

    // Simulate auth becoming available (login or rehydrate populating user).
    rerender(
      <MemoryRouter>
        <NotificationsProvider userId='user-456'>
          <div>child</div>
        </NotificationsProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getUserNotificationsMock).toHaveBeenCalledWith('user-456');
    });
  });
});
