/**
 * Behavioral tests for the open-redirect guard on the admin LoginPage.
 *
 * ADS-security: the `from` redirect coming from react-router location.state
 * must be validated before use — malicious values must fall back to '/'.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../pages/LoginPage';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  AuthLayout: ({
    title,
    children,
    footer,
  }: {
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{children}</div>
      {footer && <div>{footer}</div>}
    </div>
  ),
  LoginForm: ({
    onSuccess,
  }: {
    onSuccess: () => void;
    showForgotPassword?: boolean;
    onForgotPassword?: () => void;
    helperText?: React.ReactNode;
  }) => <button onClick={onSuccess}>Sign In</button>,
  useAuth: vi.fn(() => ({ isAuthenticated: false, isLoading: false, user: null })),
}));

const mockNavigate = vi.fn();
const mockLocation = { state: null as unknown, pathname: '/login' };

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

vi.mock('@adopt-dont-shop/lib.legal', () => ({
  ManageCookiesLink: () => <button type='button'>Manage cookies</button>,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Login page open-redirect guard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation.state = null;
  });

  it('navigates to "/" when no redirect state is present', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('navigates to a safe internal path from location state', async () => {
    mockLocation.state = { from: { pathname: '/users' } };
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/users', { replace: true });
  });

  it('falls back to "/" for a protocol-relative URL (//evil.com)', async () => {
    mockLocation.state = { from: { pathname: '//evil.com' } };
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('falls back to "/" for a backslash variant (/\\\\evil)', async () => {
    mockLocation.state = { from: { pathname: '/\\evil' } };
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('falls back to "/" for an absolute http URL', async () => {
    mockLocation.state = { from: { pathname: 'http://evil.com' } };
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('falls back to "/" for a javascript: pseudo-URL', async () => {
    mockLocation.state = { from: { pathname: 'javascript:alert(1)' } };
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
