import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextType } from '../contexts/AuthContext';
import { LoginForm } from './LoginForm';

const buildAuthValue = (): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  refreshUser: vi.fn(),
});

const renderLoginForm = () =>
  render(
    <AuthContext.Provider value={buildAuthValue()}>
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
