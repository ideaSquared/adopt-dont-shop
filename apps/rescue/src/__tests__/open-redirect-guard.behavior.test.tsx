/**
 * Behavioral tests for the open-redirect guard on the rescue LoginPage.
 *
 * Verifies that `location.state.from.pathname` is validated before use;
 * unsafe values must fall back to '/'.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';

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
    helperText?: React.ReactNode;
  }) => <button onClick={onSuccess}>Sign In</button>,
}));

vi.mock('@adopt-dont-shop/lib.legal', () => ({
  ManageCookiesLink: () => <button type="button">Manage cookies</button>,
}));

const mockNavigate = vi.fn();
const mockLocation = { state: null as unknown, pathname: '/login', hash: '', search: '' };

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// ── Import component AFTER mocks ──────────────────────────────────────────────
import LoginPage from '../pages/LoginPage';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Rescue LoginPage open-redirect guard', () => {
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
    mockLocation.state = { from: { pathname: '/applications' } };
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/applications', { replace: true });
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

  it('falls back to "/" for an http absolute URL', async () => {
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
