import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { COOKIE_CONSENT_STORAGE_KEY } from '@adopt-dont-shop/lib.legal';
import { AppShell } from './AppShell';

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

vi.mock('@/contexts/NotificationsContext', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
}));

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => ({ unreadMessageCount: 0 }),
}));

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
    trackPageView: vi.fn(),
    analyticsService: {},
  }),
}));

vi.mock('@/components/ui/SwipeFloatingButton', () => ({
  SwipeFloatingButton: () => <div data-testid='swipe-fab' />,
}));

vi.mock('@/components/onboarding/SwipeOnboarding', () => ({
  SwipeOnboarding: () => <div data-testid='swipe-onboarding' />,
}));

const renderShell = (path = '/') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path='/' element={<div>Home</div>} />
              <Route path='/privacy' element={<div>Privacy</div>} />
              <Route path='/terms' element={<div>Terms</div>} />
              <Route path='*' element={<div>Reading page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );

describe('AppShell swipe onboarding', () => {
  it('offers the swipe onboarding on browsing pages', () => {
    renderShell('/');
    expect(screen.getByTestId('swipe-onboarding')).toBeInTheDocument();
  });

  it.each([
    '/privacy',
    '/terms',
    '/cookies',
    '/blog',
    '/blog/a-post',
    '/help',
    '/help/an-article',
    '/about',
    '/contact',
    // The router matches case-insensitively and with a trailing slash.
    '/contact/',
    '/About',
    '/Help/an-article',
  ])('keeps the swipe onboarding off %s', path => {
    renderShell(path);
    expect(screen.queryByTestId('swipe-onboarding')).not.toBeInTheDocument();
  });
});

describe('AppShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the app navbar logo', () => {
    renderShell();
    expect(screen.getByRole('link', { name: /adoptdontshop/i })).toBeInTheDocument();
  });

  it('renders the nested route content in the main region', () => {
    renderShell();
    expect(screen.getByRole('main')).toContainElement(screen.getByText('Home'));
  });

  it('renders the floating swipe button', () => {
    renderShell();
    expect(screen.getByTestId('swipe-fab')).toBeInTheDocument();
  });

  it('renders a skip-to-main-content link pointing at the main region', () => {
    renderShell();
    const skip = screen.getByRole('link', { name: /skip to main content/i });
    expect(skip).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('clears the stored consent record when the footer "Manage cookies" link is clicked', async () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        cookiesVersion: '2026-05-09-v1',
        analyticsConsent: true,
        acceptedAt: '2026-05-10T00:00:00.000Z',
      })
    );
    renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Manage cookies' }));

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });
});
