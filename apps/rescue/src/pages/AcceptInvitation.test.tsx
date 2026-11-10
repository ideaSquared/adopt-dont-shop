import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AcceptInvitation from './AcceptInvitation';

const getInvitationDetails = vi.fn();
const acceptInvitation = vi.fn();

vi.mock('../services/libraryServices', () => ({
  invitationService: {
    getInvitationDetails: (...args: unknown[]) => getInvitationDetails(...args),
    acceptInvitation: (...args: unknown[]) => acceptInvitation(...args),
  },
}));

// The shared test setup stubs lib.auth; this page needs the real token hook.
vi.mock('@adopt-dont-shop/lib.auth', async importOriginal => ({
  useOneTimeUrlToken: (await importOriginal<typeof import('@adopt-dont-shop/lib.auth')>())
    .useOneTimeUrlToken,
}));

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/accept-invitation?token=tok_123']}>
        <AcceptInvitation />
      </MemoryRouter>
    </QueryClientProvider>
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

  it('shows the account form when the gateway returns the invitation under data', async () => {
    const { InvitationsService } = await vi.importActual<
      typeof import('@adopt-dont-shop/lib.invitations')
    >('@adopt-dont-shop/lib.invitations');
    const gatewayApi = {
      get: vi.fn().mockResolvedValue({
        success: true,
        data: {
          invitationId: 'inv-1',
          email: 'newstaff@rescue.org',
          rescueId: 'rsc-1',
          expiration: '2099-01-01T00:00:00Z',
          used: false,
          createdAt: '2026-01-01T00:00:00Z',
        },
      }),
    };
    const real = new InvitationsService(gatewayApi as never);
    getInvitationDetails.mockImplementation((token: string) => real.getInvitationDetails(token));

    renderPage();

    expect(await screen.findByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByText(/newstaff@rescue.org/)).toBeInTheDocument();
    expect(screen.queryByText(/not found or has expired/i)).not.toBeInTheDocument();
  });
});
