import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextType } from '../contexts/AuthContext';
import { LoginForm } from './LoginForm';

const buildAuthValue = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
});

const renderLoginForm = (value: AuthContextType = buildAuthValue()) =>
  render(
    <AuthContext.Provider value={value}>
      <LoginForm />
    </AuthContext.Provider>
  );

describe('LoginForm autocomplete attributes', () => {
  it('marks the email field as the username for password managers', () => {
    renderLoginForm();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);

    expect(emailInput).toHaveAttribute('autocomplete', 'username');
  });

  it('marks the password field as the current password so managers fill it', () => {
    renderLoginForm();

    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
  });
});

describe('LoginForm 2FA token field [C2-2]', () => {
  // Step into the 2FA state by stubbing login to throw the well-known
  // "two-factor required" error the form keys on, then exercise the
  // hex backup-code path. The 16-char hex codes the backend issues must
  // survive a paste without being truncated to 8 chars.
  const enter2faMode = async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(new Error('Two-factor authentication code required'));

    renderLoginForm(buildAuthValue({ login }));

    await user.type(screen.getByPlaceholderText(/enter your email/i), 'a@b.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    return { user };
  };

  it('preserves the full 16-char hex backup code the user pastes', async () => {
    const { user } = await enter2faMode();

    const token = screen.getByPlaceholderText('000000');
    const backupCode = '0123456789abcdef';

    await user.click(token);
    await user.paste(backupCode);

    expect(token).toHaveValue(backupCode);
  });
});

describe('LoginForm async error announcement [C2-7]', () => {
  it('exposes the form-level error in a role="alert" live region', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(new Error('Invalid email or password.'));

    renderLoginForm(buildAuthValue({ login }));

    await user.type(screen.getByPlaceholderText(/enter your email/i), 'a@b.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await waitFor(() => screen.getByRole('alert'));
    expect(alert).toHaveTextContent(/invalid email or password/i);
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
