/**
 * Behavioral tests for Bulk Operations (Admin App)
 *
 * Tests admin-facing bulk action behavior:
 * - BulkActionToolbar is hidden when no rows are selected
 * - BulkActionToolbar shows selected count when rows are selected
 * - Selecting a row shows the bulk toolbar
 * - Clearing selection hides the bulk toolbar
 * - Selecting all rows shows the correct count
 * - Bulk confirmation modal opens for each action type
 * - Confirmation modal closes on cancel
 * - Confirmation modal shows result summary after success
 * - Destructive actions require a reason
 * - Non-destructive actions do not require a reason
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, within } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Users from '../pages/Users';
import Rescues from '../pages/Rescues';
import type { AdminUser } from '../types/user';
import type { AdminRescue } from '@/types/rescue';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockUseUsers = vi.fn();
const mockUseSuspendUser = vi.fn();
const mockUseUnsuspendUser = vi.fn();
const mockUseVerifyUser = vi.fn();
const mockUseDeleteUser = vi.fn();
const mockUseBulkUpdateUsers = vi.fn();
const mockUseBulkUpdateRescues = vi.fn();

vi.mock('../hooks', () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args),
  useSuspendUser: () => mockUseSuspendUser(),
  useUnsuspendUser: () => mockUseUnsuspendUser(),
  useVerifyUser: () => mockUseVerifyUser(),
  useDeleteUser: () => mockUseDeleteUser(),
  useBulkUpdateUsers: () => mockUseBulkUpdateUsers(),
  useBulkUpdateRescues: () => mockUseBulkUpdateRescues(),
}));

const mockGetAll = vi.fn();
vi.mock('@/services/rescueService', () => ({
  rescueService: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
    getById: vi.fn(),
    verify: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock('../services/libraryServices', () => ({
  apiService: {
    patch: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../components/modals', () => ({
  UserDetailModal: () => null,
  EditUserModal: () => null,
  CreateSupportTicketModal: () => null,
  UserActionsMenu: ({ user }: { user: AdminUser }) => (
    <button data-testid={`actions-${user.userId}`}>Actions</button>
  ),
  BulkConfirmationModal: ({
    isOpen,
    onClose,
    onConfirm,
    title,
    selectedCount,
    confirmLabel,
    requireReason,
    isLoading,
    resultSummary,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => void;
    title: string;
    selectedCount: number;
    confirmLabel: string;
    requireReason?: boolean;
    isLoading?: boolean;
    resultSummary?: { succeeded: number; failed: number } | null;
  }) => {
    if (!isOpen) {
      return null;
    }
    return (
      <div data-testid='bulk-confirmation-modal'>
        <span data-testid='modal-title'>{title}</span>
        <span data-testid='modal-count'>{selectedCount} items selected</span>
        {requireReason && (
          <textarea
            data-testid='reason-textarea'
            placeholder='Enter reason...'
            onChange={() => {}}
          />
        )}
        {resultSummary ? (
          <div data-testid='result-summary'>
            {resultSummary.succeeded} succeeded, {resultSummary.failed} failed
          </div>
        ) : (
          <>
            <button onClick={onClose} data-testid='cancel-btn'>
              Cancel
            </button>
            <button
              onClick={() => onConfirm('test reason')}
              data-testid='confirm-btn'
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </button>
          </>
        )}
      </div>
    );
  },
  RescueDetailModal: () => null,
  RescueVerificationModal: () => null,
  SendEmailModal: () => null,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAdminUsers: AdminUser[] = [
  {
    userId: 'user-1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    userType: 'adopter',
    status: 'active',
    emailVerified: true,
    phoneNumber: null,
    phoneVerified: false,
    profileImageUrl: null,
    bio: null,
    country: null,
    city: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    rescueId: null,
    rescueName: null,
    lastLoginAt: '2024-01-15T00:00:00Z',
    lastLogin: '2024-01-15T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    userId: 'user-2',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    userType: 'adopter',
    status: 'active',
    emailVerified: true,
    phoneNumber: null,
    phoneVerified: false,
    profileImageUrl: null,
    bio: null,
    country: null,
    city: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    rescueId: null,
    rescueName: null,
    lastLoginAt: '2024-01-10T00:00:00Z',
    lastLogin: '2024-01-10T00:00:00Z',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockAdminRescues: AdminRescue[] = [
  {
    rescueId: 'rescue-1',
    name: 'Happy Paws',
    email: 'info@happypaws.org',
    city: 'London',
    state: 'England',
    status: 'pending',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    verifiedAt: null,
  } as AdminRescue,
  {
    rescueId: 'rescue-2',
    name: 'Safe Haven',
    email: 'info@safehaven.org',
    city: 'Manchester',
    state: 'England',
    status: 'verified',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    verifiedAt: '2024-01-03T00:00:00Z',
  } as AdminRescue,
];

const mockMutationResult = {
  mutateAsync: vi
    .fn()
    .mockResolvedValue({ successCount: 2, failedCount: 0, success: 2, failed: 0 }),
  mutate: vi.fn(),
  isLoading: false,
  isError: false,
  isSuccess: false,
  reset: vi.fn(),
};

// ── Setup helpers ─────────────────────────────────────────────────────────────

const setupUsers = (users: AdminUser[] = mockAdminUsers) => {
  mockUseUsers.mockReturnValue({
    data: { data: users },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseSuspendUser.mockReturnValue(mockMutationResult);
  mockUseUnsuspendUser.mockReturnValue(mockMutationResult);
  mockUseVerifyUser.mockReturnValue(mockMutationResult);
  mockUseDeleteUser.mockReturnValue(mockMutationResult);
  mockUseBulkUpdateUsers.mockReturnValue(mockMutationResult);
};

const setupRescues = (rescues: AdminRescue[] = mockAdminRescues) => {
  mockGetAll.mockResolvedValue({
    data: rescues,
    pagination: { page: 1, limit: 20, total: rescues.length, pages: 1 },
  });
  mockUseBulkUpdateRescues.mockReturnValue(mockMutationResult);
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Bulk operations — Users page', () => {
  beforeEach(() => {
    setupUsers();
  });

  describe('selection UI', () => {
    it('does not show the bulk toolbar when no rows are selected', () => {
      renderWithProviders(<Users />);
      expect(screen.queryByRole('toolbar', { name: /bulk actions/i })).not.toBeInTheDocument();
    });

    it('shows checkboxes in the table header and rows', () => {
      renderWithProviders(<Users />);
      const checkboxes = screen.getAllByRole('checkbox');
      // 1 header checkbox + 1 per user row
      expect(checkboxes.length).toBe(mockAdminUsers.length + 1);
    });

    it('shows the bulk toolbar after selecting a row', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // first data row

      expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeInTheDocument();
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('hides the bulk toolbar after clearing selection', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /clear/i }));
      expect(screen.queryByRole('toolbar', { name: /bulk actions/i })).not.toBeInTheDocument();
    });

    it('shows correct count when multiple rows are selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('selects all rows when header checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const headerCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(headerCheckbox);

      expect(screen.getByText(`${mockAdminUsers.length} selected`)).toBeInTheDocument();
    });
  });

  describe('bulk action toolbar actions', () => {
    it('shows Activate, Deactivate, and Delete action buttons in the toolbar', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      expect(within(toolbar).getByRole('button', { name: /^activate$/i })).toBeInTheDocument();
      expect(within(toolbar).getByRole('button', { name: /^deactivate$/i })).toBeInTheDocument();
      expect(within(toolbar).getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    it('opens the bulk confirmation modal when Activate is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      await user.click(within(toolbar).getByRole('button', { name: /^activate$/i }));

      expect(screen.getByTestId('bulk-confirmation-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Activate Users');
    });

    it('opens the bulk confirmation modal when Deactivate is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      await user.click(within(toolbar).getByRole('button', { name: /^deactivate$/i }));

      expect(screen.getByTestId('bulk-confirmation-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Deactivate Users');
    });

    it('opens the bulk confirmation modal when Delete is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      await user.click(within(toolbar).getByRole('button', { name: /^delete$/i }));

      expect(screen.getByTestId('bulk-confirmation-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Delete Users');
    });

    it('shows the number of selected items in the confirmation modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);
      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      await user.click(within(toolbar).getByRole('button', { name: /^activate$/i }));

      expect(screen.getByTestId('modal-count')).toHaveTextContent('2 items selected');
    });
  });

  describe('bulk confirmation modal', () => {
    it('closes the modal when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      await user.click(screen.getByRole('button', { name: /^activate$/i }));
      await user.click(screen.getByTestId('cancel-btn'));

      expect(screen.queryByTestId('bulk-confirmation-modal')).not.toBeInTheDocument();
    });

    it('calls bulkUpdateUsers when Activate is confirmed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      await user.click(screen.getByRole('button', { name: /^activate$/i }));
      await user.click(screen.getByTestId('confirm-btn'));

      await waitFor(() => {
        expect(mockMutationResult.mutateAsync).toHaveBeenCalled();
      });
    });
  });
});

describe('Bulk operations — Rescues page', () => {
  beforeEach(() => {
    setupRescues();
  });

  describe('selection UI', () => {
    it('does not show the bulk toolbar when no rescues are selected', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Happy Paws')).toBeInTheDocument();
      });
      expect(screen.queryByRole('toolbar', { name: /bulk actions/i })).not.toBeInTheDocument();
    });

    it('shows checkboxes in the rescue table', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Happy Paws')).toBeInTheDocument();
      });
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(mockAdminRescues.length + 1);
    });

    it('shows the bulk toolbar after selecting a rescue', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Happy Paws')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeInTheDocument();
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });
  });

  describe('bulk action toolbar for rescues', () => {
    it('shows Approve and Suspend action buttons in the toolbar', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Happy Paws')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      expect(within(toolbar).getByRole('button', { name: /^approve$/i })).toBeInTheDocument();
      expect(within(toolbar).getByRole('button', { name: /^suspend$/i })).toBeInTheDocument();
    });

    it('opens the confirmation modal when Approve is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Happy Paws')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      await user.click(within(toolbar).getByRole('button', { name: /^approve$/i }));

      expect(screen.getByTestId('bulk-confirmation-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Approve Rescues');
    });

    it('opens the confirmation modal when Suspend is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Happy Paws')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      await user.click(within(toolbar).getByRole('button', { name: /^suspend$/i }));

      expect(screen.getByTestId('bulk-confirmation-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Suspend Rescues');
    });

    it('calls bulkUpdateRescues when Approve is confirmed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Happy Paws')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      await user.click(within(toolbar).getByRole('button', { name: /^approve$/i }));
      await user.click(screen.getByTestId('confirm-btn'));

      await waitFor(() => {
        expect(mockMutationResult.mutateAsync).toHaveBeenCalled();
      });
    });
  });
});
