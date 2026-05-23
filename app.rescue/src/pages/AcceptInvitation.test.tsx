import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, waitFor, screen } from '../test-utils';
import AcceptInvitation from './AcceptInvitation';

const getInvitationDetailsMock = vi.fn();

vi.mock('../services/libraryServices', () => ({
  invitationService: {
    getInvitationDetails: (token: string) => getInvitationDetailsMock(token),
    acceptInvitation: vi.fn(),
  },
}));

let searchParamsValue = new URLSearchParams('?token=token-123');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [searchParamsValue, vi.fn()] as const,
  };
});

describe('AcceptInvitation autocomplete attributes', () => {
  beforeEach(() => {
    getInvitationDetailsMock.mockReset();
    searchParamsValue = new URLSearchParams('?token=token-123');
  });

  it('annotates name and password fields so password managers fill them', async () => {
    getInvitationDetailsMock.mockResolvedValue({ email: 'invitee@example.com' });

    renderWithProviders(<AcceptInvitation />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter your first name/i)).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/enter your first name/i)).toHaveAttribute(
      'autocomplete',
      'given-name'
    );
    expect(screen.getByPlaceholderText(/enter your last name/i)).toHaveAttribute(
      'autocomplete',
      'family-name'
    );
    expect(screen.getByPlaceholderText(/create a secure password/i)).toHaveAttribute(
      'autocomplete',
      'new-password'
    );
    expect(screen.getByPlaceholderText(/re-enter your password/i)).toHaveAttribute(
      'autocomplete',
      'new-password'
    );
  });
});

describe('AcceptInvitation invitation context [C2-4]', () => {
  beforeEach(() => {
    getInvitationDetailsMock.mockReset();
    searchParamsValue = new URLSearchParams('?token=token-123');
  });

  it('shows the inviter, rescue, and role when the backend returns them', async () => {
    getInvitationDetailsMock.mockResolvedValue({
      email: 'invitee@example.com',
      rescueName: 'Happy Tails Rescue',
      invitedByName: 'Jane Doe',
      role: 'Volunteer Coordinator',
    });

    renderWithProviders(<AcceptInvitation />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter your first name/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/invited by Jane Doe to join Happy Tails Rescue as Volunteer Coordinator/i)
    ).toBeInTheDocument();
  });

  it('falls back to the generic copy when the backend omits the new fields', async () => {
    getInvitationDetailsMock.mockResolvedValue({ email: 'invitee@example.com' });

    renderWithProviders(<AcceptInvitation />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter your first name/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/invited to join a rescue organization/i)).toBeInTheDocument();
  });
});

describe('AcceptInvitation async error announcement [C2-7]', () => {
  beforeEach(() => {
    getInvitationDetailsMock.mockReset();
    searchParamsValue = new URLSearchParams('?token=bad-token');
  });

  it('exposes the load failure in a role="alert" live region', async () => {
    getInvitationDetailsMock.mockRejectedValue(new Error('boom'));

    renderWithProviders(<AcceptInvitation />);

    const alert = await waitFor(() => screen.getByRole('alert'));
    expect(alert).toHaveTextContent(/failed to load invitation details/i);
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
