import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from '../services/auth-service';
import { ForgotPasswordPage, ResetPasswordPage } from './PasswordRecoveryPages';

vi.mock('../services/auth-service', () => ({
  authService: { forgotPassword: vi.fn(), resetPassword: vi.fn() },
}));

const LocationProbe = () => <p>search={useLocation().search}</p>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.forgotPassword).mockResolvedValue(undefined);
  vi.mocked(authService.resetPassword).mockResolvedValue(undefined);
});

describe('ForgotPasswordPage', () => {
  it('offers the forgot-password form, returning to sign-in', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/email address/i), 'staff@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/login'
    );
  });
});

describe('ResetPasswordPage', () => {
  it('submits the emailed token with the new password and strips it from the URL (ADS-1012)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/reset-password?token=tok-1']}>
        <ResetPasswordPage />
        <LocationProbe />
      </MemoryRouter>
    );

    expect(await screen.findByText('search=')).toBeInTheDocument();
    await user.type(screen.getByLabelText('New password'), 'Str0ng!pass');
    await user.type(screen.getByLabelText('Confirm new password'), 'Str0ng!pass');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(authService.resetPassword).toHaveBeenCalledWith('tok-1', 'Str0ng!pass');
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('explains an incomplete link when no token is present', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/reset link is incomplete/i)).toBeInTheDocument();
  });
});
