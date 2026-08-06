import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AcceptInvitation from './AcceptInvitation';

const getInvitationDetails = vi.fn();
const acceptInvitation = vi.fn();

vi.mock('../services/libraryServices', () => ({
  invitationService: {
    getInvitationDetails: (...args: unknown[]) => getInvitationDetails(...args),
    acceptInvitation: (...args: unknown[]) => acceptInvitation(...args),
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/accept-invitation?token=tok_123']}>
      <AcceptInvitation />
    </MemoryRouter>
  );

describe('AcceptInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInvitationDetails.mockResolvedValue({
      email: 'newstaff@rescue.org',
      rescueName: 'Happy Tails',
      invitedByName: 'Jane',
      role: 'Volunteer',
    });
    acceptInvitation.mockResolvedValue(undefined);
  });

  it('renders the account fields once the invitation loads', async () => {
    renderPage();

    expect(await screen.findByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('rejects mismatched passwords and does not accept the invitation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText(/first name/i), 'Sam');
    await user.type(screen.getByLabelText(/last name/i), 'Smith');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different456');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it('accepts the invitation when the form is valid', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText(/first name/i), 'Sam');
    await user.type(screen.getByLabelText(/last name/i), 'Smith');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledTimes(1));
    expect(acceptInvitation.mock.calls[0][0]).toMatchObject({
      token: 'tok_123',
      firstName: 'Sam',
      lastName: 'Smith',
      password: 'password123',
    });
  });
});
