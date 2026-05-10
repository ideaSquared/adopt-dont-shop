/**
 * Behavioral tests for LoginPage (Rescue App).
 *
 * Covers the cookies-policy promise: an unauthenticated visitor on the
 * login page can re-open the cookie banner from the page chrome.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../test-utils';
import { COOKIE_CONSENT_STORAGE_KEY } from '@adopt-dont-shop/lib.legal';
import LoginPage from './LoginPage';

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    AuthLayout: ({
      title,
      subtitle,
      children,
      footer,
    }: {
      title: string;
      subtitle?: string;
      children: React.ReactNode;
      footer?: React.ReactNode;
    }) => (
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        <div>{children}</div>
        {footer && <div>{footer}</div>}
      </div>
    ),
    LoginForm: () => <div data-testid="login-form" />,
  };
});

describe('Rescue LoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears the stored consent record when the "Manage cookies" link is clicked', async () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        cookiesVersion: '2026-05-09-v1',
        analyticsConsent: true,
        acceptedAt: '2026-05-10T00:00:00.000Z',
      })
    );

    renderWithProviders(<LoginPage />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Manage cookies' }));

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });
});
