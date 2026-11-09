import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleteAccount = vi.fn();
const logout = vi.fn();
const mockAuth = vi.hoisted(() => ({ twoFactorEnabled: false }));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  authService: { deleteAccount: (...args: unknown[]) => deleteAccount(...args) },
  useAuth: () => ({
    user: { userId: 'user-1', twoFactorEnabled: mockAuth.twoFactorEnabled },
    logout,
  }),
}));

const assign = vi.fn();
vi.mock('../utils/leave-app', () => ({ leaveApp: () => assign('/') }));

import { DeleteAccountSection } from './DeleteAccountSection';

const renderSection = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DeleteAccountSection />
    </QueryClientProvider>
  );

const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Delete account…' }));
  return screen.findByRole('dialog');
};

const confirmButton = () => screen.getByRole('button', { name: 'Delete my account' });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.twoFactorEnabled = false;
  deleteAccount.mockResolvedValue(undefined);
  logout.mockResolvedValue(undefined);
});

describe('DeleteAccountSection', () => {
  it('asks for the current password before deleting', async () => {
    const user = userEvent.setup();
    renderSection();

    await openModal(user);

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/two-factor code/i)).not.toBeInTheDocument();
  });

  it('also asks for a two-factor code when 2FA is on', async () => {
    const user = userEvent.setup();
    mockAuth.twoFactorEnabled = true;
    renderSection();

    await openModal(user);

    expect(screen.getByLabelText(/two-factor code/i)).toBeInTheDocument();
  });

  it('does not submit without a password', async () => {
    const user = userEvent.setup();
    renderSection();

    await openModal(user);
    await user.click(confirmButton());

    expect(await screen.findByText(/enter your password/i)).toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes the account, signs out and leaves the app', async () => {
    const user = userEvent.setup();
    mockAuth.twoFactorEnabled = true;
    renderSection();

    await openModal(user);
    await user.type(screen.getByLabelText(/current password/i), 'hunter2');
    await user.type(screen.getByLabelText(/two-factor code/i), '123456');
    await user.click(confirmButton());

    await waitFor(() =>
      expect(deleteAccount).toHaveBeenCalledWith({
        reason: 'User requested account deletion',
        password: 'hunter2',
        twoFactorToken: '123456',
      })
    );
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
    expect(logout).toHaveBeenCalled();
  });

  it.each([
    ['credential_verification_failed', /that password was incorrect/i],
    ['two_factor_required', /enter the 6-digit code/i],
    ['last_super_admin', /only active super admin/i],
    ['last_rescue_staff', /last staff member of your rescue/i],
  ])('explains a %s refusal and keeps the user signed in', async (code, message) => {
    const user = userEvent.setup();
    deleteAccount.mockRejectedValue(new Error(code));
    renderSection();

    await openModal(user);
    await user.type(screen.getByLabelText(/current password/i), 'hunter2');
    await user.click(confirmButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});
