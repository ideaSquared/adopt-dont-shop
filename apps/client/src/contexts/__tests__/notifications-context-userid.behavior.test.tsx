import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
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

let queryClient = new QueryClient();

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  getUserNotificationsMock.mockClear();
});

const renderWithProvider = (userId?: string) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationsProvider userId={userId}>
          <div>child</div>
        </NotificationsProvider>
      </MemoryRouter>
    </QueryClientProvider>
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
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NotificationsProvider userId={undefined}>
            <div>child</div>
          </NotificationsProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initially no userId -> no fetch.
    expect(getUserNotificationsMock).not.toHaveBeenCalled();

    // Simulate auth becoming available (login or rehydrate populating user).
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NotificationsProvider userId='user-456'>
            <div>child</div>
          </NotificationsProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(getUserNotificationsMock).toHaveBeenCalledWith('user-456');
    });
  });
});
