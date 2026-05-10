import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/components/ui/SwipeFloatingButton', () => ({
  SwipeFloatingButton: () => <div data-testid='swipe-fab' />,
}));

vi.mock('@/components/onboarding/SwipeOnboarding', () => ({
  SwipeOnboarding: () => null,
}));

const renderShell = () =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path='/' element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('AppShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the app navbar logo', () => {
    renderShell();
    expect(screen.getByRole('link', { name: /adopt don't shop/i })).toBeInTheDocument();
  });

  it('renders the nested route content in the main region', () => {
    renderShell();
    expect(screen.getByRole('main')).toContainElement(screen.getByText('Home'));
  });

  it('renders the floating swipe button', () => {
    renderShell();
    expect(screen.getByTestId('swipe-fab')).toBeInTheDocument();
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
