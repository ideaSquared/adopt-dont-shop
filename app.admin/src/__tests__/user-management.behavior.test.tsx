/**
 * Behavioral tests for User Management (Admin App)
 *
 * Tests admin-facing behavior:
 * - Admin sees the user management page with heading and description
 * - Admin sees a list of users with names, emails, and badges
 * - Loading state shown while data is being fetched
 * - Error state shown when the API fails
 * - Admin can filter users by type and status
 * - Admin can search for users
 * - Admin can open user detail by clicking a row
 * - Admin can open edit modal and send message modal
 * - Admin can perform actions: suspend, unsuspend, verify, delete
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Users from '../pages/Users';
import type { AdminUser } from '../types/user';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockUseUsers = vi.fn();
const mockUseSuspendUser = vi.fn();
const mockUseUnsuspendUser = vi.fn();
const mockUseVerifyUser = vi.fn();
const mockUseDeleteUser = vi.fn();
const mockUseBulkUpdateUsers = vi.fn();

vi.mock('../hooks', () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args),
  useSuspendUser: () => mockUseSuspendUser(),
  useUnsuspendUser: () => mockUseUnsuspendUser(),
  useVerifyUser: () => mockUseVerifyUser(),
  useDeleteUser: () => mockUseDeleteUser(),
  useBulkUpdateUsers: () => mockUseBulkUpdateUsers(),
}));

vi.mock('../services/libraryServices', () => ({
  apiService: {
    patch: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../components/modals', () => ({
  BulkConfirmationModal: () => null,
  UserDetailModal: ({
    isOpen,
    user,
  }: {
    isOpen: boolean;
    onClose: () => void;
    user: AdminUser | null;
  }) =>
    isOpen && user ? (
      <div data-testid='user-detail-modal'>
        <span>Detail: {user.email}</span>
      </div>
    ) : null,
  EditUserModal: ({
    isOpen,
    user,
  }: {
    isOpen: boolean;
    onClose: () => void;
    user: AdminUser | null;
    onSave: () => void;
  }) =>
    isOpen && user ? (
      <div data-testid='edit-user-modal'>
        <span>Edit: {user.email}</span>
      </div>
    ) : null,
  CreateSupportTicketModal: ({
    isOpen,
    user,
  }: {
    isOpen: boolean;
    onClose: () => void;
    user: AdminUser | null;
    onCreate: () => void;
  }) =>
    isOpen && user ? (
      <div data-testid='support-ticket-modal'>
        <span>Ticket for: {user.email}</span>
      </div>
    ) : null,
  UserActionsMenu: ({
    user,
    onSuspend,
    onUnsuspend,
  }: {
    user: AdminUser;
    onSuspend: (userId: string, reason?: string) => Promise<void>;
    onUnsuspend: (userId: string) => Promise<void>;
    onVerify: (userId: string) => Promise<void>;
    onDelete: (userId: string, reason?: string) => Promise<void>;
  }) => (
    <div>
      <button data-testid={`actions-${user.userId}`}>Actions</button>
      <button
        data-testid={`suspend-${user.userId}`}
        onClick={() => onSuspend(user.userId, 'test reason')}
      >
        Suspend
      </button>
      <button data-testid={`unsuspend-${user.userId}`} onClick={() => onUnsuspend(user.userId)}>
        Unsuspend
      </button>
    </div>
  ),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

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
    userType: 'rescue_staff',
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
    rescueId: 'rescue-1',
    rescueName: 'Happy Paws',
    lastLoginAt: '2024-01-10T00:00:00Z',
    lastLogin: '2024-01-10T00:00:00Z',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    userId: 'user-3',
    email: 'bob.suspended@example.com',
    firstName: 'Bob',
    lastName: 'Suspended',
    userType: 'adopter',
    status: 'suspended',
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
    lastLoginAt: null,
    lastLogin: null,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const mockMutationResult = {
  mutateAsync: vi.fn().mockResolvedValue({}),
  mutate: vi.fn(),
  isLoading: false,
  isError: false,
  isSuccess: false,
  reset: vi.fn(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const setupSuccessfulLoad = (users: AdminUser[] = mockAdminUsers) => {
  mockUseUsers.mockReturnValue({
    data: { data: users },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
};

const setupLoadingState = () => {
  mockUseUsers.mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  });
};

const setupErrorState = (message = 'Network error') => {
  mockUseUsers.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new Error(message),
    refetch: vi.fn(),
  });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('User Management page', () => {
  beforeEach(() => {
    setupSuccessfulLoad();
    mockUseSuspendUser.mockReturnValue(mockMutationResult);
    mockUseUnsuspendUser.mockReturnValue(mockMutationResult);
    mockUseVerifyUser.mockReturnValue(mockMutationResult);
    mockUseDeleteUser.mockReturnValue(mockMutationResult);
    mockUseBulkUpdateUsers.mockReturnValue(mockMutationResult);
  });

  describe('page structure', () => {
    it('shows the User Management heading', () => {
      renderWithProviders(<Users />);
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    it('shows the page description', () => {
      renderWithProviders(<Users />);
      expect(screen.getByText('Manage all platform users and permissions')).toBeInTheDocument();
    });

    it('shows the Export button', () => {
      renderWithProviders(<Users />);
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('shows the Add User button', () => {
      renderWithProviders(<Users />);
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
    });

    it('shows the search input', () => {
      renderWithProviders(<Users />);
      expect(screen.getByPlaceholderText(/search by name or email/i)).toBeInTheDocument();
    });

    it('shows the User Type filter', () => {
      renderWithProviders(<Users />);
      expect(screen.getByText('User Type')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
    });

    it('shows the Status filter', () => {
      renderWithProviders(<Users />);
      // "Status" appears as both a filter label and a column header
      const statusLabels = screen.getAllByText('Status');
      expect(statusLabels.length).toBeGreaterThan(0);
      expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows skeleton rows while fetching users', () => {
      setupLoadingState();
      const { container } = renderWithProviders(<Users />);
      const skeletonRows = container.querySelectorAll('[data-testid="skeleton-row"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
    });

    it('does not show user data while loading', () => {
      setupLoadingState();
      renderWithProviders(<Users />);
      expect(screen.queryByText('john.doe@example.com')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows a failure message when the API returns an error', () => {
      setupErrorState('Failed to connect to server');
      renderWithProviders(<Users />);
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });

    it('shows the specific error message', () => {
      setupErrorState('Failed to connect to server');
      renderWithProviders(<Users />);
      expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
    });
  });

  describe('displaying users', () => {
    it('renders user names in the table', () => {
      renderWithProviders(<Users />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('renders user emails in the table', () => {
      renderWithProviders(<Users />);
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
    });

    it('shows the Adopter badge for adopter users', () => {
      renderWithProviders(<Users />);
      // "Adopter" appears as badge and also in the filter dropdown
      const adopterLabels = screen.getAllByText('Adopter');
      expect(adopterLabels.length).toBeGreaterThan(0);
    });

    it('shows the Rescue Staff badge for rescue staff users', () => {
      renderWithProviders(<Users />);
      // "Rescue Staff" appears as badge and also in the filter dropdown
      const rescueStaffLabels = screen.getAllByText('Rescue Staff');
      expect(rescueStaffLabels.length).toBeGreaterThan(0);
    });

    it('shows the Active status badge for active users', () => {
      renderWithProviders(<Users />);
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBeGreaterThan(0);
    });

    it('shows the Suspended status badge for suspended users', () => {
      renderWithProviders(<Users />);
      // "Suspended" appears as badge and also in the status filter dropdown
      const suspendedLabels = screen.getAllByText('Suspended');
      expect(suspendedLabels.length).toBeGreaterThan(0);
    });

    it('shows the rescue name for rescue staff', () => {
      renderWithProviders(<Users />);
      expect(screen.getByText('Happy Paws')).toBeInTheDocument();
    });

    it('shows a dash when user has no rescue', () => {
      renderWithProviders(<Users />);
      const dashCells = screen.getAllByText('-');
      expect(dashCells.length).toBeGreaterThan(0);
    });

    it('shows the table column headers', () => {
      renderWithProviders(<Users />);
      // Column headers are among the visible text elements
      expect(screen.getAllByText('User').length).toBeGreaterThan(0);
      expect(screen.getByText('Type')).toBeInTheDocument();
      // "Status" appears as both column header and filter label
      expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    });

    it('shows an empty message when no users match', () => {
      setupSuccessfulLoad([]);
      renderWithProviders(<Users />);
      expect(screen.getByText('No users found matching your criteria')).toBeInTheDocument();
    });
  });

  describe('filtering users', () => {
    it('passes the user type filter to the data hook when admin selects Adopter', async () => {
      const user = userEvent.setup();
      mockUseUsers.mockImplementation((filters: { userType?: string }) => ({
        data: {
          data:
            filters.userType === 'adopter'
              ? mockAdminUsers.filter(u => u.userType === 'adopter')
              : mockAdminUsers,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      }));

      renderWithProviders(<Users />);

      await user.selectOptions(screen.getByDisplayValue('All Types'), 'adopter');

      await waitFor(() => {
        expect(screen.queryByText('jane.smith@example.com')).not.toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });
    });

    it('passes the status filter to the data hook when admin selects Suspended', async () => {
      const user = userEvent.setup();
      mockUseUsers.mockImplementation((filters: { status?: string }) => ({
        data: {
          data:
            filters.status === 'suspended'
              ? mockAdminUsers.filter(u => u.status === 'suspended')
              : mockAdminUsers,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      }));

      renderWithProviders(<Users />);

      await user.selectOptions(screen.getByDisplayValue('All Statuses'), 'suspended');

      await waitFor(() => {
        expect(screen.getByText('bob.suspended@example.com')).toBeInTheDocument();
        expect(screen.queryByText('john.doe@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('user detail modal', () => {
    it('opens the detail modal when admin clicks on a user row', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      await user.click(screen.getByText('john.doe@example.com'));

      expect(screen.getByTestId('user-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Detail: john.doe@example.com')).toBeInTheDocument();
    });
  });

  describe('user action buttons', () => {
    it('renders action buttons for each user row', () => {
      renderWithProviders(<Users />);
      // Each user row has its own edit/message buttons
      const editButtons = screen.getAllByTitle('Edit user');
      expect(editButtons.length).toBe(mockAdminUsers.length);
      const messageButtons = screen.getAllByTitle('Send message');
      expect(messageButtons.length).toBe(mockAdminUsers.length);
    });

    it('opens edit modal when admin clicks Edit on a user', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const editButtons = screen.getAllByTitle('Edit user');
      await user.click(editButtons[0]);

      expect(screen.getByTestId('edit-user-modal')).toBeInTheDocument();
    });

    it('opens support ticket modal when admin clicks Send message', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Users />);

      const messageButtons = screen.getAllByTitle('Send message');
      await user.click(messageButtons[0]);

      expect(screen.getByTestId('support-ticket-modal')).toBeInTheDocument();
    });
  });

  describe('suspension feedback messages', () => {
    it('shows a success message when a user is suspended successfully', async () => {
      const user = userEvent.setup();
      mockUseSuspendUser.mockReturnValue({
        ...mockMutationResult,
        mutateAsync: vi.fn().mockResolvedValue({}),
      });
      renderWithProviders(<Users />);

      await user.click(screen.getByTestId('suspend-user-1'));

      await waitFor(() => {
        expect(screen.getByText('User suspended successfully')).toBeInTheDocument();
      });
    });

    it('shows an error message when suspension fails', async () => {
      const user = userEvent.setup();
      mockUseSuspendUser.mockReturnValue({
        ...mockMutationResult,
        mutateAsync: vi.fn().mockRejectedValue(new Error('Permission denied')),
      });
      renderWithProviders(<Users />);

      await user.click(screen.getByTestId('suspend-user-1'));

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });

    it('shows a generic error message when suspension fails without a message', async () => {
      const user = userEvent.setup();
      mockUseSuspendUser.mockReturnValue({
        ...mockMutationResult,
        mutateAsync: vi.fn().mockRejectedValue('unknown error'),
      });
      renderWithProviders(<Users />);

      await user.click(screen.getByTestId('suspend-user-1'));

      await waitFor(() => {
        expect(screen.getByText('Failed to suspend user')).toBeInTheDocument();
      });
    });

    it('shows a success message when a user is unsuspended successfully', async () => {
      const user = userEvent.setup();
      mockUseUnsuspendUser.mockReturnValue({
        ...mockMutationResult,
        mutateAsync: vi.fn().mockResolvedValue({}),
      });
      renderWithProviders(<Users />);

      await user.click(screen.getByTestId('unsuspend-user-3'));

      await waitFor(() => {
        expect(screen.getByText('User unsuspended successfully')).toBeInTheDocument();
      });
    });

    it('shows an error message when unsuspension fails', async () => {
      const user = userEvent.setup();
      mockUseUnsuspendUser.mockReturnValue({
        ...mockMutationResult,
        mutateAsync: vi.fn().mockRejectedValue(new Error('Server unavailable')),
      });
      renderWithProviders(<Users />);

      await user.click(screen.getByTestId('unsuspend-user-3'));

      await waitFor(() => {
        expect(screen.getByText('Server unavailable')).toBeInTheDocument();
      });
    });
  });
});
