import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

/**
 * App-level smoke test for ADS-497 wiring: confirms the legal re-acceptance
 * modal is mounted in the authenticated admin tree. The modal's own
 * behaviour (auth/pending/error states) is covered by tests in lib.legal —
 * here we only verify wire-up in this app.
 */

const useAuthMock = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => useAuthMock(),
}));

// Replace the modal + banner with sentinels so the test asserts wiring
// without pulling in their full network behaviour.
vi.mock('@adopt-dont-shop/lib.legal', () => ({
  LegalReacceptanceModal: () => <div data-testid='legal-reacceptance-modal-sentinel' />,
  CookieBanner: () => <div data-testid='cookie-banner-sentinel' />,
  attachStoredCookieConsent: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib.analytics', () => ({
  useAnalyticsInvalidator: vi.fn(),
}));

vi.mock('./components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('./components/layout/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('./components/dev/DevLoginPanel', () => ({
  default: () => null,
}));
vi.mock('./components/ErrorBoundary', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import App from './App';

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  );

describe('AdminApp [ADS-497 modal wiring]', () => {
  it('mounts the LegalReacceptanceModal when the admin user is authenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false });

    renderApp();

    expect(screen.getByTestId('legal-reacceptance-modal-sentinel')).toBeInTheDocument();
  });

  it('does not mount the LegalReacceptanceModal on the public/login branch', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isLoading: false });

    renderApp();

    expect(screen.queryByTestId('legal-reacceptance-modal-sentinel')).not.toBeInTheDocument();
  });
});

describe('AdminApp [ADS-497 cookie banner wiring]', () => {
  it('mounts the CookieBanner on the authenticated branch', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false });

    renderApp();

    expect(screen.getByTestId('cookie-banner-sentinel')).toBeInTheDocument();
  });

  it('mounts the CookieBanner on the public/login branch (anonymous visitors decide too)', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isLoading: false });

    renderApp();

    expect(screen.getByTestId('cookie-banner-sentinel')).toBeInTheDocument();
  });
});
