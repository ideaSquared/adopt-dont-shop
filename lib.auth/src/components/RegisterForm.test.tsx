import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextType } from '../contexts/AuthContext';
import { RegisterForm } from './RegisterForm';

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

const renderRegisterForm = (
  requirePhoneNumber = false,
  value: AuthContextType = buildAuthValue()
) =>
  render(
    <AuthContext.Provider value={value}>
      <RegisterForm requirePhoneNumber={requirePhoneNumber} />
    </AuthContext.Provider>
  );

describe('RegisterForm autocomplete attributes', () => {
  it('marks the name fields with given-name and family-name', () => {
    renderRegisterForm();

    expect(screen.getByPlaceholderText(/enter your first name/i)).toHaveAttribute(
      'autocomplete',
      'given-name'
    );
    expect(screen.getByPlaceholderText(/enter your last name/i)).toHaveAttribute(
      'autocomplete',
      'family-name'
    );
  });

  it('marks the email field as email', () => {
    renderRegisterForm();

    expect(screen.getByPlaceholderText(/enter your email/i)).toHaveAttribute(
      'autocomplete',
      'email'
    );
  });

  it('marks the phone number field as tel when present', () => {
    renderRegisterForm(true);

    expect(screen.getByPlaceholderText(/\(555\) 123-4567/)).toHaveAttribute('autocomplete', 'tel');
  });

  it('marks both password fields as new-password so managers prompt to save', () => {
    renderRegisterForm();

    expect(screen.getByPlaceholderText(/create a strong password/i)).toHaveAttribute(
      'autocomplete',
      'new-password'
    );
    expect(screen.getByPlaceholderText(/confirm your password/i)).toHaveAttribute(
      'autocomplete',
      'new-password'
    );
  });
});

describe('RegisterForm async error announcement [C2-7]', () => {
  it('exposes the form-level error in a role="alert" live region', async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn().mockRejectedValue(new Error('Email already in use.'));

    renderRegisterForm(true, buildAuthValue({ register: registerMock }));

    await user.type(screen.getByPlaceholderText(/enter your first name/i), 'Ada');
    await user.type(screen.getByPlaceholderText(/enter your last name/i), 'Lovelace');
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'ada@example.com');
    await user.type(screen.getByPlaceholderText(/\(555\) 123-4567/), '5551234567');
    await user.type(screen.getByPlaceholderText(/create a strong password/i), 'Password1!');
    await user.type(screen.getByPlaceholderText(/confirm your password/i), 'Password1!');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
    });

    const alert = await waitFor(() => screen.getByRole('alert'));
    expect(alert).toHaveTextContent(/email already in use/i);
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
