/**
 * UX P2 I: the mobile dropdown overlay and the full-center overlay used to
 * carry role="button" so the click-to-dismiss div didn't trip lint. That
 * announced a phantom "Close notifications" / "Close notification center"
 * button to screen readers. Both are now role="presentation"; the explicit
 * bell button toggles the dropdown.
 *
 * action_url guard: non-safe paths (protocol-relative, backslash variants,
 * absolute URLs) must not be passed to navigate(). The guard is unit-tested
 * in safeRedirect.test.ts; here we verify the component wires it up correctly
 * for the http/https case (openExternal) and the internal-path case (navigate).
 */
import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test-utils/render';
import type { Notification } from '@/services/notificationService';

// jsdom doesn't define the Notification web API; the component calls
// Notification.permission inside the bell toggle handler.
beforeAll(() => {
  type NotificationStub = { permission: 'default' | 'granted' | 'denied' };
  (globalThis as { Notification?: NotificationStub }).Notification = { permission: 'granted' };
});

const mockNavigate = vi.fn();
const mockMarkAsRead = vi.fn().mockResolvedValue(undefined);
const mockRefreshUnreadCount = vi.fn().mockResolvedValue(undefined);
const mockOpenExternal = vi.fn();

let mockRecentNotifications: Notification[] = [];

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    unreadCount: mockRecentNotifications.length,
    recentNotifications: mockRecentNotifications,
    isLoading: false,
    markAsRead: mockMarkAsRead,
    refreshUnreadCount: mockRefreshUnreadCount,
  }),
}));

vi.mock('@/services/notificationService', () => ({
  default: {
    markAllAsRead: vi.fn(),
    requestPushPermission: vi.fn(),
  },
}));

vi.mock('@/utils/openExternal', () => ({
  openExternal: (...args: unknown[]) => mockOpenExternal(...args),
}));

vi.mock('./NotificationCenter', () => ({
  NotificationCenterComponent: () => <div data-testid='stub-notification-center' />,
}));

import { NotificationBell } from './NotificationBell';

const makeNotification = (actionUrl: string): Notification => ({
  notification_id: 'n-1',
  title: 'Test notification',
  message: 'Hello',
  type: 'system',
  read_at: null,
  created_at: new Date().toISOString(),
  data: { action_url: actionUrl },
});

describe('NotificationBell backdrop accessibility (UX P2 I)', () => {
  beforeEach(() => {
    mockRecentNotifications = [];
    mockNavigate.mockClear();
    mockOpenExternal.mockClear();
  });

  it('does not expose the mobile overlay as a button when the dropdown opens', () => {
    renderWithProviders(<NotificationBell />);

    // Open the dropdown via the actual bell button.
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.queryByRole('button', { name: /close notifications/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /close notification center/i })).toBeNull();
  });
});

describe('NotificationBell action_url guard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockOpenExternal.mockClear();
  });

  it('navigates to a safe internal path when clicking a notification', async () => {
    mockRecentNotifications = [makeNotification('/pets/123')];
    renderWithProviders(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByText('Test notification'));
    expect(mockNavigate).toHaveBeenCalledWith('/pets/123');
  });

  it('calls openExternal for https URLs', async () => {
    mockRecentNotifications = [makeNotification('https://external.example.com/page')];
    renderWithProviders(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByText('Test notification'));
    expect(mockOpenExternal).toHaveBeenCalledWith('https://external.example.com/page');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate or call openExternal for protocol-relative URLs', async () => {
    mockRecentNotifications = [makeNotification('//evil.com')];
    renderWithProviders(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByText('Test notification'));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('does not navigate for backslash variants', async () => {
    mockRecentNotifications = [makeNotification('/\\evil')];
    renderWithProviders(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByText('Test notification'));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });
});
