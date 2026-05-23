import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextType } from '../contexts/AuthContext';
import { RegisterForm } from './RegisterForm';

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

const renderRegisterForm = (requirePhoneNumber = false) =>
  render(
    <AuthContext.Provider value={buildAuthValue()}>
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
