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
 * - Admin can open user detail panel by clicking a row
 * - Admin can perform actions from the detail panel: suspend, unsuspend
 */

import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
const mockUseCreateUser = vi.fn();
const mockUseUserActivity = vi.fn();

vi.mock('../hooks', () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args),
  useSuspendUser: () => mockUseSuspendUser(),
  useUnsuspendUser: () => mockUseUnsuspendUser(),
  useVerifyUser: () => mockUseVerifyUser(),
  useDeleteUser: () => mockUseDeleteUser(),
  useBulkUpdateUsers: () => mockUseBulkUpdateUsers(),
  useCreateUser: () => mockUseCreateUser(),
  useUserActivity: (...args: unknown[]) => mockUseUserActivity(...args),
}));

vi.mock('../services/libraryServices', () => ({
  apiService: {
    patch: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../components/modals', () => ({
  AddUserModal: () => null,
  BulkConfirmationModal: () => null,
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
  isPending: false,
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

const renderUsersPage = (initialRoute = '/users') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ThemeProvider>
          <Routes>
            <Route path='/users' element={<Users />} />
            <Route path='/users/:userId' element={<Users />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
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
    mockUseCreateUser.mockReturnValue(mockMutationResult);
    mockUseUserActivity.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  describe('page structure', () => {
    it('shows the User Management heading', () => {
      renderUsersPage();
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    it('shows the page description', () => {
      renderUsersPage();
      expect(screen.getByText('Manage all platform users and permissions')).toBeInTheDocument();
    });

    it('shows the Export button', () => {
      renderUsersPage();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('shows the Add User button', () => {
      renderUsersPage();
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
    });

    it('shows the search input', () => {
      renderUsersPage();
      expect(screen.getByPlaceholderText(/search by name or email/i)).toBeInTheDocument();
    });

    it('shows the User Type filter', () => {
      renderUsersPage();
      expect(screen.getByText('User Type')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
    });

    it('shows the Status filter', () => {
      renderUsersPage();
      const statusLabels = screen.getAllByText('Status');
      expect(statusLabels.length).toBeGreaterThan(0);
      expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows skeleton rows while fetching users', () => {
      setupLoadingState();
      const { container } = renderUsersPage();
      const skeletonRows = container.querySelectorAll('[data-testid="skeleton-row"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
    });

    it('does not show user data while loading', () => {
      setupLoadingState();
      renderUsersPage();
      expect(screen.queryByText('john.doe@example.com')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows a failure message when the API returns an error', () => {
      setupErrorState('Failed to connect to server');
      renderUsersPage();
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });

    it('shows the specific error message', () => {
      setupErrorState('Failed to connect to server');
      renderUsersPage();
      expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
    });
  });

  describe('displaying users', () => {
    it('renders user names in the table', () => {
      renderUsersPage();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('renders user emails in the table', () => {
      renderUsersPage();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
    });

    it('shows the Adopter badge for adopter users', () => {
      renderUsersPage();
      const adopterLabels = screen.getAllByText('Adopter');
      expect(adopterLabels.length).toBeGreaterThan(0);
    });

    it('shows the Rescue Staff badge for rescue staff users', () => {
      renderUsersPage();
      const rescueStaffLabels = screen.getAllByText('Rescue Staff');
      expect(rescueStaffLabels.length).toBeGreaterThan(0);
    });

    it('shows the Active status badge for active users', () => {
      renderUsersPage();
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBeGreaterThan(0);
    });

    it('shows the Suspended status badge for suspended users', () => {
      renderUsersPage();
      const suspendedLabels = screen.getAllByText('Suspended');
      expect(suspendedLabels.length).toBeGreaterThan(0);
    });

    it('shows the rescue name for rescue staff', () => {
      renderUsersPage();
      expect(screen.getByText('Happy Paws')).toBeInTheDocument();
    });

    it('shows a dash when user has no rescue', () => {
      renderUsersPage();
      const dashCells = screen.getAllByText('-');
      expect(dashCells.length).toBeGreaterThan(0);
    });

    it('shows the table column headers', () => {
      renderUsersPage();
      expect(screen.getAllByText('User').length).toBeGreaterThan(0);
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    });

    it('shows an empty message when no users match', () => {
      setupSuccessfulLoad([]);
      renderUsersPage();
      expect(
        screen.getByText(
          'No users found matching your criteria. Try adjusting your search or filters.'
        )
      ).toBeInTheDocument();
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

      renderUsersPage();

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

      renderUsersPage();

      await user.selectOptions(screen.getByDisplayValue('All Statuses'), 'suspended');

      await waitFor(() => {
        expect(screen.getByText('bob.suspended@example.com')).toBeInTheDocument();
        expect(screen.queryByText('john.doe@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('split-pane detail panel', () => {
    it('does not show the detail panel when no user is selected', () => {
      renderUsersPage();
      expect(screen.queryByTestId('user-detail-panel')).not.toBeInTheDocument();
    });

    it('shows the detail panel when navigated to a user URL', () => {
      renderUsersPage('/users/user-1');

      const panel = screen.getByTestId('user-detail-panel');
      expect(panel).toBeInTheDocument();
      // Panel header shows the user name
      expect(panel).toHaveTextContent('John Doe');
    });

    it('shows the close button on the detail panel', () => {
      renderUsersPage('/users/user-1');

      expect(screen.getByLabelText('Close detail panel')).toBeInTheDocument();
    });
  });

  describe('suspension feedback messages', () => {
    it('shows a success message when a user is suspended via the panel', async () => {
      const user = userEvent.setup();
      mockUseSuspendUser.mockReturnValue({
        ...mockMutationResult,
        mutateAsync: vi.fn().mockResolvedValue({}),
      });

      renderUsersPage('/users/user-1');

      await user.click(screen.getByRole('tab', { name: 'Actions' }));
      await user.click(screen.getByText('Suspend User'));

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

      renderUsersPage('/users/user-1');

      await user.click(screen.getByRole('tab', { name: 'Actions' }));
      await user.click(screen.getByText('Suspend User'));

      await waitFor(() => {
        expect(screen.getByText('Failed to suspend user — Permission denied')).toBeInTheDocument();
      });
    });

    it('shows a generic error message when suspension fails without a message', async () => {
      const user = userEvent.setup();
      mockUseSuspendUser.mockReturnValue({
        ...mockMutationResult,
        mutateAsync: vi.fn().mockRejectedValue('unknown error'),
      });

      renderUsersPage('/users/user-1');

      await user.click(screen.getByRole('tab', { name: 'Actions' }));
      await user.click(screen.getByText('Suspend User'));

      await waitFor(() => {
        expect(screen.getByText('Failed to suspend user — please try again')).toBeInTheDocument();
      });
    });

    it('shows a success message when a user is unsuspended via the panel', async () => {
      const user = userEvent.setup();
      mockUseUnsuspendUser.mockReturnValue({
        ...mockMutationResult,
        mutateAsync: vi.fn().mockResolvedValue({}),
      });

      renderUsersPage('/users/user-3');

      await user.click(screen.getByRole('tab', { name: 'Actions' }));
      await user.click(screen.getByText('Unsuspend User'));

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

      renderUsersPage('/users/user-3');

      await user.click(screen.getByRole('tab', { name: 'Actions' }));
      await user.click(screen.getByText('Unsuspend User'));

      await waitFor(() => {
        expect(
          screen.getByText('Failed to unsuspend user — Server unavailable')
        ).toBeInTheDocument();
      });
    });

    it('shows a generic error message when unsuspension fails without a message', async () => {
      const user = userEvent.setup();
      mockUseUnsuspendUser.mockReturnValue({
        ...mockMutationResult,
        mutateAsync: vi.fn().mockRejectedValue('unknown error'),
      });

      renderUsersPage('/users/user-3');

      await user.click(screen.getByRole('tab', { name: 'Actions' }));
      await user.click(screen.getByText('Unsuspend User'));

      await waitFor(() => {
        expect(screen.getByText('Failed to unsuspend user — please try again')).toBeInTheDocument();
      });
    });
  });

  describe('detail panel tabs', () => {
    it('shows Overview tab by default with user details', () => {
      renderUsersPage('/users/user-1');

      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('shows Edit tab with form fields when clicked', async () => {
      const user = userEvent.setup();
      renderUsersPage('/users/user-1');

      await user.click(screen.getByRole('tab', { name: 'Edit' }));

      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('shows Actions tab with action buttons when clicked', async () => {
      const user = userEvent.setup();
      renderUsersPage('/users/user-1');

      await user.click(screen.getByRole('tab', { name: 'Actions' }));

      expect(screen.getByText('Suspend User')).toBeInTheDocument();
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });

    it('shows Activity tab when clicked', async () => {
      const user = userEvent.setup();
      renderUsersPage('/users/user-1');

      await user.click(screen.getByRole('tab', { name: 'Activity' }));

      expect(screen.getByText('No activity recorded for this user.')).toBeInTheDocument();
    });
  });
});
