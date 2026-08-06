/**
 * NotificationsPage auth guard
 *
 * Unauthenticated visitors must be redirected to /login; authenticated users
 * see the notifications list.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';

const mockIsAuthenticated = { value: true };

const notificationsStateMock: {
  notifications: unknown[];
  unreadCount: number;
  markAsRead: () => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  isLoading: boolean;
} = {
  notifications: [],
  unreadCount: 0,
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  clearAll: vi.fn(),
  isLoading: false,
};

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: mockIsAuthenticated.value,
      user: null,
    }),
  };
});

vi.mock('@/contexts/NotificationsContext', () => ({
  useNotifications: () => notificationsStateMock,
}));

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => ({
    trackPageView: vi.fn(),
    trackEvent: vi.fn(),
  }),
}));

import { NotificationsPage } from './NotificationsPage';

const renderPage = (initialEntry = '/notifications') =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path='/notifications' element={<NotificationsPage />} />
          <Route path='/login' element={<div data-testid='login-page'>Login</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('NotificationsPage auth guard', () => {
  beforeEach(() => {
    notificationsStateMock.notifications = [];
    notificationsStateMock.isLoading = false;
  });

  it('redirects unauthenticated visitors to /login', () => {
    mockIsAuthenticated.value = false;
    renderPage();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders the notifications page for authenticated users', () => {
    mockIsAuthenticated.value = true;
    renderPage();
    expect(screen.getByRole('heading', { name: /^notifications$/i, level: 1 })).toBeInTheDocument();
  });
});

// C6: standardise the empty and loading states on the shared QueryBoundary /
// EmptyState instead of bespoke markup.
describe('NotificationsPage states (C6)', () => {
  beforeEach(() => {
    mockIsAuthenticated.value = true;
    notificationsStateMock.notifications = [];
    notificationsStateMock.isLoading = false;
  });

  it('shows the shared empty state when there are no notifications', () => {
    notificationsStateMock.isLoading = false;
    renderPage();
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('shows the loading state, not the empty state, while notifications load', () => {
    notificationsStateMock.isLoading = true;
    renderPage();
    expect(screen.queryByText(/no notifications yet/i)).not.toBeInTheDocument();
  });
});
