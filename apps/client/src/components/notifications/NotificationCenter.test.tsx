/**
 * NotificationCenter – open redirect guard
 *
 * Clicking a notification with an external action_url must NOT navigate away
 * from the app. Only internal paths (starting with '/') should be navigated to.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// Use a factory that returns a stable vi.fn so hoisting works correctly.
const getNotificationsMock = vi.fn();

vi.mock('@/services/notificationService', () => ({
  default: {
    getNotifications: (...args: unknown[]) => getNotificationsMock(...args),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/types/notifications', () => ({
  NotificationType: {},
  getNotificationTypeLabel: (t: string) => t,
}));

import { NotificationCenterComponent } from './NotificationCenter';

type MockNotification = {
  notification_id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  data?: Record<string, unknown>;
};

const makePaginatedResponse = (notifications: MockNotification[]) => ({
  notifications,
  pagination: { page: 1, limit: 20, total: notifications.length, pages: 1 },
});

const renderCenter = () =>
  render(
    <ThemeProvider>
      <MemoryRouter>
        <NotificationCenterComponent />
      </MemoryRouter>
    </ThemeProvider>
  );

describe('NotificationCenter redirect guard', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getNotificationsMock.mockReset();
  });

  it('navigates to an internal path when notification has a relative action_url', async () => {
    const notification: MockNotification = {
      notification_id: 'n-1',
      title: 'Application update',
      message: 'Your application was reviewed.',
      created_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
      data: { action_url: '/applications/app-1' },
    };
    getNotificationsMock.mockResolvedValue(makePaginatedResponse([notification]));

    renderCenter();

    await waitFor(() => {
      expect(screen.getByText('Application update')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Application update'));

    expect(navigateMock).toHaveBeenCalledWith('/applications/app-1');
  });

  it('does not navigate when notification has an absolute external action_url', async () => {
    const notification: MockNotification = {
      notification_id: 'n-2',
      title: 'External notification',
      message: 'Click here.',
      created_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
      data: { action_url: 'https://evil.example.com/steal-tokens' },
    };
    getNotificationsMock.mockResolvedValue(makePaginatedResponse([notification]));

    renderCenter();

    await waitFor(() => {
      expect(screen.getByText('External notification')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('External notification'));

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('does not navigate for protocol-relative URLs (//evil.example.com)', async () => {
    const notification: MockNotification = {
      notification_id: 'n-3',
      title: 'Protocol-relative',
      message: 'Tricky.',
      created_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
      data: { action_url: '//evil.example.com/path' },
    };
    getNotificationsMock.mockResolvedValue(makePaginatedResponse([notification]));

    renderCenter();

    await waitFor(() => {
      expect(screen.getByText('Protocol-relative')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Protocol-relative'));

    expect(navigateMock).not.toHaveBeenCalled();
  });
});
