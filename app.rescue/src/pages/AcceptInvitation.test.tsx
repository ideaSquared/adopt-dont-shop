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
