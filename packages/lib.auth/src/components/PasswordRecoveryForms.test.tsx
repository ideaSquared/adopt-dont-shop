import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, NotFoundError } from '@adopt-dont-shop/lib.api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from '../services/auth-service';
import {
  ForgotPasswordForm,
  ResetPasswordForm,
  classifyFailure,
  rateLimitMessage,
} from './PasswordRecoveryForms';

vi.mock('../services/auth-service', () => ({
  authService: { forgotPassword: vi.fn(), resetPassword: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.forgotPassword).mockResolvedValue(undefined);
  vi.mocked(authService.resetPassword).mockResolvedValue(undefined);
});

describe('ForgotPasswordForm', () => {
  const request = async (email: string) => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm loginHref="/login" />);
    await user.type(screen.getByLabelText(/email address/i), email);
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
  };

  it('sends a reset link and says so without revealing whether the account exists', async () => {
    await request('staff@example.com');

    expect(authService.forgotPassword).toHaveBeenCalledWith('staff@example.com');
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByText(/if an account exists for staff@example\.com/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });

  it('shows the same answer for a 4xx, so it cannot be used to probe accounts', async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValue(new ApiError('nope', 404));

    await request('nobody@example.com');

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
  });

  it('asks the user to wait when rate limited', async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValue(
      new ApiError('slow down', 429, undefined, undefined, 30)
    );

    await request('staff@example.com');

    expect(await screen.findByRole('alert')).toHaveTextContent(/wait 30 seconds/i);
  });

  it('reports a server failure instead of pretending it worked', async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValue(new ApiError('boom', 503));

    await request('staff@example.com');

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not send the reset link/i);
  });

  it('requires a valid email before sending', async () => {
    await request('not-an-email');

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });
});

describe('ResetPasswordForm', () => {
  const reset = async (password: string, confirm: string, token: string | null = 'tok-1') => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token={token} loginHref="/login" />);
    await user.type(screen.getByLabelText(/^new password/i), password);
    await user.type(screen.getByLabelText(/confirm new password/i), confirm);
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
  };

  it('sets the new password and offers sign-in', async () => {
    await reset('NewBehaviour456!', 'NewBehaviour456!');

    await waitFor(() =>
      expect(authService.resetPassword).toHaveBeenCalledWith('tok-1', 'NewBehaviour456!')
    );
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it.each([
    ['short', 'short', /at least 8 characters/i],
    ['alllowercase1!', 'alllowercase1!', /uppercase letter/i],
    ['NoDigitsHere!', 'NoDigitsHere!', /contain a digit/i],
    ['NoSymbol12345', 'NoSymbol12345', /special character/i],
    ['NewBehaviour456!', 'NewBehaviour457!', /passwords do not match/i],
  ])('refuses %s / %s before sending', async (password, confirm, message) => {
    await reset(password, confirm);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('explains an invalid or expired link', async () => {
    vi.mocked(authService.resetPassword).mockRejectedValue(new ApiError('bad token', 400));

    await reset('NewBehaviour456!', 'NewBehaviour456!');

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
  });

  it('explains a link with no token, without a form', () => {
    render(<ResetPasswordForm token={null} loginHref="/login" />);

    expect(screen.getByRole('alert')).toHaveTextContent(/link is incomplete/i);
    expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument();
  });
});

describe('classifyFailure', () => {
  it('surfaces a 429 with its retry-after', () => {
    const err = new ApiError('slow down', 429);
    expect(classifyFailure('a@example.com', err)).toEqual({
      kind: 'rate-limited',
      retryAfterSeconds: err.retryAfterSeconds,
    });
  });

  it.each([
    ['an ApiError 4xx', new ApiError('nope', 404)],
    ['a typed NotFoundError', new NotFoundError('nope')],
  ])('answers %s like a sent link', (_label, err) => {
    expect(classifyFailure('a@example.com', err)).toEqual({ kind: 'sent', email: 'a@example.com' });
  });

  it('treats a 5xx and unknown failures as real errors', () => {
    expect(classifyFailure('a@example.com', new ApiError('boom', 503))).toEqual({ kind: 'failed' });
    expect(classifyFailure('a@example.com', new Error('offline'))).toEqual({ kind: 'failed' });
  });
});

describe('rateLimitMessage', () => {
  it('names the wait in seconds, or a minute when unknown', () => {
    expect(rateLimitMessage(1)).toMatch(/wait 1 second and/);
    expect(rateLimitMessage(30)).toMatch(/wait 30 seconds and/);
    expect(rateLimitMessage(undefined)).toMatch(/wait a minute and/);
  });
});
