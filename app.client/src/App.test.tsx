import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// Capture the userId prop NotificationsProvider receives, so we can assert
// that App.tsx wires user.userId from useAuth() through to it. Mocking the
// provider keeps this test focused on the wiring, not the provider's internals
// (those have their own behaviour tests).
const notificationsProviderUserIdSpy = vi.fn<(userId: string | undefined) => void>();

vi.mock('@/contexts/NotificationsContext', () => ({
  NotificationsProvider: ({ children, userId }: { children: ReactNode; userId?: string }) => {
    notificationsProviderUserIdSpy(userId);
    return <>{children}</>;
  },
}));

// Stub the other context providers so App can render without their full deps.
vi.mock('@/contexts/PermissionsContext', () => ({
  PermissionsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/AnalyticsContext', () => ({
  AnalyticsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/ChatContext', () => ({
  ChatProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/FavoritesContext', () => ({
  FavoritesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// AppShell pulls in heavy navigation/chat dependencies; replace it with a
// minimal pass-through that renders the nested route via <Outlet />.
vi.mock('./components/layout/AppShell', async () => {
  const { Outlet } = await import('react-router-dom');
  return { AppShell: () => <Outlet /> };
});
vi.mock('./components/layout/PublicAuthLayout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { PublicAuthLayout: () => <Outlet /> };
});

vi.mock('./components/dev/DevLoginPanel', () => ({
  DevLoginPanel: () => null,
}));

vi.mock('./components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// ADS-497: replace the legal modal + cookie banner with sentinels so the
// App-level wiring tests don't pull in their network behaviour.
vi.mock('@adopt-dont-shop/lib.legal', () => ({
  LegalReacceptanceModal: () => <div data-testid='legal-reacceptance-modal-sentinel' />,
  CookieBanner: () => <div data-testid='cookie-banner-sentinel' />,
  attachStoredCookieConsent: vi.fn(),
}));

// Stable mock for useAuth that we can reconfigure per test.
const useAuthMock = vi.fn();
vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => useAuthMock(),
  };
});

import App from './App';

const baseAuth = {
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  refreshUser: vi.fn(),
};

afterEach(() => {
  notificationsProviderUserIdSpy.mockClear();
  useAuthMock.mockReset();
});

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>
  );

describe('App notifications wiring', () => {
  it('passes undefined userId to NotificationsProvider when no user is authenticated', async () => {
    useAuthMock.mockReturnValue({ ...baseAuth, user: null, isAuthenticated: false });

    renderApp();

    await waitFor(() => {
      expect(notificationsProviderUserIdSpy).toHaveBeenCalled();
    });
    expect(notificationsProviderUserIdSpy).toHaveBeenLastCalledWith(undefined);
  });

  it('passes user.userId to NotificationsProvider when AuthProvider has an authenticated user', async () => {
    useAuthMock.mockReturnValue({
      ...baseAuth,
      user: {
        userId: 'user-abc',
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
        userType: 'adopter',
      },
      isAuthenticated: true,
    });

    renderApp();

    await waitFor(() => {
      expect(notificationsProviderUserIdSpy).toHaveBeenCalled();
    });
    expect(notificationsProviderUserIdSpy).toHaveBeenLastCalledWith('user-abc');
  });
});

describe('App [ADS-497 slice 5] cookie banner wiring', () => {
  it('mounts the CookieBanner alongside the LegalReacceptanceModal', async () => {
    useAuthMock.mockReturnValue({ ...baseAuth, user: null, isAuthenticated: false });

    renderApp();

    // The banner + modal are sibling sentinels of the routed Suspense
    // boundary, so they're available before the lazy LoginPage finishes
    // loading. waitFor handles the React 19 act() flush.
    await waitFor(() => {
      expect(screen.getByTestId('cookie-banner-sentinel')).toBeInTheDocument();
    });
    expect(screen.getByTestId('legal-reacceptance-modal-sentinel')).toBeInTheDocument();
  });
});
