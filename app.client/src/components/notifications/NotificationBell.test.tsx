/**
 * UX P2 I: the mobile dropdown overlay and the full-center overlay used to
 * carry role="button" so the click-to-dismiss div didn't trip lint. That
 * announced a phantom "Close notifications" / "Close notification center"
 * button to screen readers. Both are now role="presentation"; the explicit
 * bell button toggles the dropdown.
 */
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render';

// jsdom doesn't define the Notification web API; the component calls
// Notification.permission inside the bell toggle handler.
beforeAll(() => {
  type NotificationStub = { permission: 'default' | 'granted' | 'denied' };
  (globalThis as { Notification?: NotificationStub }).Notification = { permission: 'granted' };
});

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    unreadCount: 0,
    recentNotifications: [],
    isLoading: false,
    markAsRead: vi.fn(),
    refreshUnreadCount: vi.fn(),
  }),
}));

vi.mock('@/services/notificationService', () => ({
  default: {
    markAllAsRead: vi.fn(),
  },
}));

vi.mock('./NotificationCenter', () => ({
  NotificationCenterComponent: () => <div data-testid='stub-notification-center' />,
}));

import { NotificationBell } from './NotificationBell';

describe('NotificationBell backdrop accessibility (UX P2 I)', () => {
  it('does not expose the mobile overlay as a button when the dropdown opens', () => {
    renderWithProviders(<NotificationBell />);

    // Open the dropdown via the actual bell button.
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.queryByRole('button', { name: /close notifications/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /close notification center/i })).toBeNull();
  });
});
