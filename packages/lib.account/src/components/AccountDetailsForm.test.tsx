import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateProfile = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({
    user: {
      userId: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneNumber: '01632 960001',
    },
    updateProfile,
  }),
}));

import { AccountDetailsForm } from './AccountDetailsForm';

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AccountDetailsForm />
    </QueryClientProvider>
  );

const saveButton = () => screen.getByRole('button', { name: /save details/i });

beforeEach(() => {
  updateProfile.mockReset();
  updateProfile.mockResolvedValue(undefined);
});

describe('AccountDetailsForm', () => {
  it('shows the signed-in user’s current details', () => {
    renderForm();

    expect(screen.getByLabelText(/first name/i)).toHaveValue('Ada');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Lovelace');
    expect(screen.getByLabelText(/phone/i)).toHaveValue('01632 960001');
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('saves the edited details', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), 'Augusta');
    await user.click(saveButton());

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        firstName: 'Augusta',
        lastName: 'Lovelace',
        phoneNumber: '01632 960001',
      })
    );
    expect(await screen.findByText(/details saved/i)).toBeInTheDocument();
  });

  it('requires a first and last name', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText(/last name/i));
    await user.click(saveButton());

    expect(await screen.findByText(/enter your last name/i)).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('rejects a phone number that is not a UK number, but allows leaving it empty', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText(/phone/i));
    await user.type(screen.getByLabelText(/phone/i), '12345');
    await user.click(saveButton());

    expect(await screen.findByText(/enter a valid uk phone number/i)).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/phone/i));
    await user.click(saveButton());

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: '' }))
    );
  });

  it('tells the user when saving fails', async () => {
    const user = userEvent.setup();
    updateProfile.mockRejectedValue(new Error('down'));
    renderForm();

    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save your details/i);
  });
});
