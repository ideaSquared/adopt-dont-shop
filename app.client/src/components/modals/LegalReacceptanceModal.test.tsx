import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import { LegalReacceptanceModal } from './LegalReacceptanceModal';
import type { User } from '@adopt-dont-shop/lib.auth';

type AuthState = { user: User | null; isAuthenticated: boolean };

const authState: AuthState = { user: null, isAuthenticated: false };

const baseUser: User = {
  userId: 'u-1',
  email: 'user@example.com',
  firstName: 'Sam',
  lastName: 'Doe',
  emailVerified: true,
  userType: 'adopter',
  status: 'active',
};

const fetchPendingMock = vi.fn();
const recordReacceptanceMock = vi.fn();

vi.mock('@/services/legalService', () => ({
  fetchPendingReacceptance: () => fetchPendingMock(),
  recordReacceptance: (input: unknown) => recordReacceptanceMock(input),
}));

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: authState.user,
      isAuthenticated: authState.isAuthenticated,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

describe('LegalReacceptanceModal [ADS-497 slice 2]', () => {
  beforeEach(() => {
    authState.user = null;
    authState.isAuthenticated = false;
    fetchPendingMock.mockReset();
    recordReacceptanceMock.mockReset();
  });

  it('does not render for unauthenticated users and never calls the API', async () => {
    fetchPendingMock.mockResolvedValue({ pending: [] });
    render(<LegalReacceptanceModal />);

    // No auth → no fetch, no modal.
    expect(fetchPendingMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('legal-reacceptance-modal')).not.toBeInTheDocument();
  });

  it('does not render when authenticated user has no pending documents', async () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    fetchPendingMock.mockResolvedValue({ pending: [] });

    render(<LegalReacceptanceModal />);

    await waitFor(() => {
      expect(fetchPendingMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByTestId('legal-reacceptance-modal')).not.toBeInTheDocument();
  });

  it('renders the modal with a disabled accept button until the checkbox is ticked, then records consent and closes', async () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    fetchPendingMock.mockResolvedValue({
      pending: [
        {
          documentType: 'terms',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: '2025-09-01-v1',
          lastAcceptedAt: '2025-09-02T00:00:00.000Z',
        },
      ],
    });
    recordReacceptanceMock.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<LegalReacceptanceModal />);

    const modal = await screen.findByTestId('legal-reacceptance-modal');
    expect(
      within(modal).getByRole('checkbox', { name: /i accept the updated terms of service/i })
    ).toBeInTheDocument();

    const acceptButton = within(modal).getByRole('button', { name: /accept and continue/i });
    expect(acceptButton).toBeDisabled();

    const checkbox = within(modal).getByRole('checkbox', {
      name: /i accept the updated terms of service/i,
    });
    await user.click(checkbox);

    expect(acceptButton).toBeEnabled();

    await user.click(acceptButton);

    await waitFor(() => {
      expect(recordReacceptanceMock).toHaveBeenCalledTimes(1);
    });
    expect(recordReacceptanceMock).toHaveBeenCalledWith({
      tosAccepted: true,
      privacyAccepted: true,
    });

    await waitFor(() => {
      expect(screen.queryByTestId('legal-reacceptance-modal')).not.toBeInTheDocument();
    });
  });

  it('shows an error and keeps the modal open when recording consent fails, and the user can retry', async () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    fetchPendingMock.mockResolvedValue({
      pending: [
        {
          documentType: 'privacy',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
      ],
    });
    recordReacceptanceMock
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(<LegalReacceptanceModal />);

    const modal = await screen.findByTestId('legal-reacceptance-modal');
    const checkbox = within(modal).getByRole('checkbox', {
      name: /i accept the updated privacy policy/i,
    });
    await user.click(checkbox);

    await user.click(within(modal).getByRole('button', { name: /accept and continue/i }));

    expect(await within(modal).findByText(/network down/i)).toBeInTheDocument();
    expect(screen.getByTestId('legal-reacceptance-modal')).toBeInTheDocument();

    // Retry path uses the same primary button, now labelled Retry.
    const retryButton = within(modal).getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(recordReacceptanceMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('legal-reacceptance-modal')).not.toBeInTheDocument();
    });
  });
});
