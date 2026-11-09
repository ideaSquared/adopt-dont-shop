import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const confirmEmailChange = vi.fn();
const logout = vi.fn();
const mockAuth = vi.hoisted(() => ({ signedIn: false }));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: mockAuth.signedIn ? { userId: 'user-1' } : null, logout }),
}));

vi.mock('../services/email-change-service', () => ({
  confirmEmailChange: (...args: unknown[]) => confirmEmailChange(...args),
}));

import { ConfirmEmailChange } from './ConfirmEmailChange';

const renderPage = (token: string | null) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ConfirmEmailChange token={token} signInHref='/login' />
    </QueryClientProvider>
  );

const confirmButton = () => screen.getByRole('button', { name: /confirm new email/i });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.signedIn = false;
  confirmEmailChange.mockResolvedValue(undefined);
  logout.mockResolvedValue(undefined);
});

describe('ConfirmEmailChange', () => {
  it('waits for a click — link scanners open emailed links and would use up the token', () => {
    renderPage('tok-123');

    expect(confirmButton()).toBeInTheDocument();
    expect(confirmEmailChange).not.toHaveBeenCalled();
  });

  it('confirms and tells the user to sign in with the new address', async () => {
    const user = userEvent.setup();
    renderPage('tok-123');

    await user.click(confirmButton());

    await waitFor(() => expect(confirmEmailChange).toHaveBeenCalledWith('tok-123'));
    expect(await screen.findByRole('heading', { name: /email changed/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(logout).not.toHaveBeenCalled();
  });

  it('clears a session in this browser, since confirming signs out everywhere', async () => {
    const user = userEvent.setup();
    mockAuth.signedIn = true;
    renderPage('tok-123');

    await user.click(confirmButton());

    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it('explains a missing token without offering to confirm', () => {
    renderPage(null);

    expect(screen.getByRole('alert')).toHaveTextContent(/link is incomplete/i);
    expect(screen.queryByRole('button', { name: /confirm new email/i })).not.toBeInTheDocument();
  });

  it.each([
    ['invalid_or_expired_token', /link has expired or has already been used/i],
    ['email_in_use', /now belongs to another account/i],
    ['boom', /could not confirm your new email/i],
  ])('explains a %s refusal', async (code, message) => {
    const user = userEvent.setup();
    confirmEmailChange.mockRejectedValue(new Error(code));
    renderPage('tok-123');

    await user.click(confirmButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});
