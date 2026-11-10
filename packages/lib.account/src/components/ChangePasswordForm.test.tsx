import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const changePassword = vi.fn();
const logout = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', async importOriginal => ({
  // Keep the real password policy so weak passwords are rejected as in production.
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.auth')>()),
  authService: { changePassword: (...args: unknown[]) => changePassword(...args) },
  useAuth: () => ({ logout }),
}));

vi.mock('@adopt-dont-shop/lib.components', async importOriginal => ({
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.components')>()),
  toast: { success: (...args: unknown[]) => toastSuccess(...args) },
}));

import { ChangePasswordForm } from './ChangePasswordForm';

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChangePasswordForm />
    </QueryClientProvider>
  );

const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  { current, next, confirm }: { current: string; next: string; confirm: string }
) => {
  await user.type(screen.getByLabelText(/current password/i), current);
  await user.type(screen.getByLabelText(/^new password/i), next);
  await user.type(screen.getByLabelText(/confirm new password/i), confirm);
  await user.click(screen.getByRole('button', { name: /change password/i }));
};

beforeEach(() => {
  vi.clearAllMocks();
  changePassword.mockResolvedValue(undefined);
  logout.mockResolvedValue(undefined);
});

describe('ChangePasswordForm', () => {
  it('changes the password, then signs the user out everywhere with an explanation', async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, { current: 'old-pass-1', next: 'New-pass-123', confirm: 'New-pass-123' });

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: 'old-pass-1',
        newPassword: 'New-pass-123',
      })
    );
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringMatching(/sign in with your new password/i)
    );
  });

  it('requires the new password to be at least 8 characters', async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, { current: 'old-pass-1', next: 'short', confirm: 'short' });

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ['no uppercase letter', 'new-pass-123!', /uppercase letter/i],
    ['no digit', 'New-pass-abc', /digit/i],
    ['no symbol', 'NewPass123', /special character/i],
  ])('rejects a new password with %s', async (_label, next, message) => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, { current: 'old-pass-1', next, confirm: next });

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('requires the confirmation to match', async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, { current: 'old-pass-1', next: 'New-pass-123', confirm: 'New-pass-124' });

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('says so when the current password is wrong, and keeps the user signed in', async () => {
    const user = userEvent.setup();
    changePassword.mockRejectedValue(new Error('current password is incorrect'));
    renderForm();

    await fill(user, { current: 'wrong', next: 'New-pass-123', confirm: 'New-pass-123' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not change your password\. check your current password/i
    );
    expect(logout).not.toHaveBeenCalled();
  });
});
