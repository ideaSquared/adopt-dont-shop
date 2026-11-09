import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestEmailChange = vi.fn();
const mockAuth = vi.hoisted(() => ({ twoFactorEnabled: false }));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({
    user: {
      userId: 'user-1',
      email: 'ada@example.com',
      twoFactorEnabled: mockAuth.twoFactorEnabled,
    },
  }),
}));

vi.mock('../services/email-change-service', () => ({
  requestEmailChange: (...args: unknown[]) => requestEmailChange(...args),
}));

import { ChangeEmailForm } from './ChangeEmailForm';

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChangeEmailForm />
    </QueryClientProvider>
  );

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /send confirmation link/i }));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.twoFactorEnabled = false;
  requestEmailChange.mockResolvedValue(undefined);
});

describe('ChangeEmailForm', () => {
  it('shows the current email', () => {
    renderForm();

    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('sends a confirmation link to the new address and says the email stays the same until then', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/new email/i), '  New@Example.com ');
    await user.type(screen.getByLabelText(/current password/i), 'hunter2');
    await submit(user);

    await waitFor(() =>
      expect(requestEmailChange).toHaveBeenCalledWith({
        newEmail: 'new@example.com',
        password: 'hunter2',
      })
    );
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/new@example\.com/);
    expect(status).toHaveTextContent(/stays ada@example\.com until you confirm/i);
  });

  it('asks for the two-factor code when 2FA is on', async () => {
    const user = userEvent.setup();
    mockAuth.twoFactorEnabled = true;
    renderForm();

    await user.type(screen.getByLabelText(/new email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/current password/i), 'hunter2');
    await user.type(screen.getByLabelText(/two-factor code/i), '123456');
    await submit(user);

    await waitFor(() =>
      expect(requestEmailChange).toHaveBeenCalledWith({
        newEmail: 'new@example.com',
        password: 'hunter2',
        twoFactorToken: '123456',
      })
    );
  });

  it.each([
    ['not-an-email', 'hunter2', /enter a valid email address/i],
    ['ada@example.com', 'hunter2', /already your email/i],
    ['new@example.com', '', /enter your current password/i],
  ])('refuses %s / password %s before sending anything', async (email, password, message) => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/new email/i), email);
    if (password) {
      await user.type(screen.getByLabelText(/current password/i), password);
    }
    await submit(user);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(requestEmailChange).not.toHaveBeenCalled();
  });

  it.each([
    ['credential_verification_failed', /that password was incorrect/i],
    ['two_factor_required', /enter the 6-digit code/i],
    ['invalid_email', /enter a valid email address/i],
    ['email_unchanged', /already your email/i],
    ['boom', /could not start the email change/i],
  ])('explains a %s refusal', async (code, message) => {
    const user = userEvent.setup();
    requestEmailChange.mockRejectedValue(new Error(code));
    renderForm();

    await user.type(screen.getByLabelText(/new email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/current password/i), 'hunter2');
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});
