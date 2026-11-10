import { useEffect, useState, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * An unauthenticated visit to a deep link must land back on that URL (path and
 * query) after signing in. App swaps its route tree when `isAuthenticated`
 * flips, so this drives the whole flow through the real App, LoginPage and
 * ProtectedRoute with only the sign-in itself stubbed.
 */

const authStore = vi.hoisted(() => {
  let authenticated = false;
  const listeners = new Set<() => void>();
  return {
    get: () => authenticated,
    set: (value: boolean) => {
      authenticated = value;
      listeners.forEach(listener => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock('@adopt-dont-shop/lib.auth', async importOriginal => {
  const actual = await importOriginal<typeof import('@adopt-dont-shop/lib.auth')>();
  return {
    ...actual,
    useAuth: () => {
      const [isAuthenticated, setIsAuthenticated] = useState(authStore.get());
      useEffect(() => authStore.subscribe(() => setIsAuthenticated(authStore.get())), []);
      return {
        isAuthenticated,
        isInitializing: false,
        isLoading: false,
        user: isAuthenticated ? { userId: 'u1', userType: 'rescue_staff' } : null,
      };
    },
    AuthLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    // Mirrors the real form: the session flips first, then onSuccess fires.
    LoginForm: ({ onSuccess }: { onSuccess?: () => void }) => (
      <button
        onClick={async () => {
          await Promise.resolve();
          authStore.set(true);
          await Promise.resolve();
          onSuccess?.();
        }}
      >
        Sign In
      </button>
    ),
  };
});

vi.mock('@adopt-dont-shop/lib.legal', () => ({
  LegalReacceptanceModal: () => null,
  CookieBanner: () => null,
  ManageCookiesLink: () => null,
  attachStoredCookieConsent: vi.fn(),
}));
vi.mock('../components/shared/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../components/dev/DevLoginPanel', () => ({ default: () => null }));
vi.mock('../components/ErrorBoundary', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../pages/Dashboard', () => ({ default: () => <h1>Dashboard page</h1> }));
vi.mock('../pages/PetManagement', () => ({
  default: function PetsPage() {
    const { pathname, search } = useLocation();
    return <h1>Pets page {pathname + search}</h1>;
  },
}));

import App from '../App';

const signInFrom = async (url: string) => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  );
  await user.click(await screen.findByRole('button', { name: 'Sign In' }));
};

describe('rescue deep link survives sign-in', () => {
  afterEach(() => authStore.set(false));

  it('returns to the deep link, query string included, after login', async () => {
    await signInFrom('/pets?status=x');

    expect(await screen.findByRole('heading', { name: 'Pets page /pets?status=x' })).toBeVisible();
  });

  it('goes to the dashboard when the visitor opened the login page directly', async () => {
    await signInFrom('/login');

    expect(await screen.findByRole('heading', { name: 'Dashboard page' })).toBeVisible();
  });
});
