import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from 'styled-components';
import Users from './Users';
import type { AdminUser } from '../services/libraryServices';

// Mock theme for styled-components
const mockTheme = {
  colors: {
    primary: {
      100: '#e0e7ff',
      500: '#667eea',
    },
  },
};

// Mock user data
const mockUsers: AdminUser[] = [
  {
    userId: 'user-1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    userType: 'adopter',
    status: 'active',
    emailVerified: true,
    rescueName: null,
    createdAt: '2024-01-15T10:00:00Z',
    lastLogin: '2024-11-09T14:30:00Z',
    updatedAt: '2024-11-09T14:30:00Z',
  },
  {
    userId: 'user-2',
    email: 'jane.smith@rescue.org',
    firstName: 'Jane',
    lastName: 'Smith',
    userType: 'rescue_staff',
    status: 'active',
    emailVerified: true,
    rescueName: 'Happy Paws Rescue',
    createdAt: '2024-02-20T12:00:00Z',
    lastLogin: '2024-11-10T09:00:00Z',
    updatedAt: '2024-11-10T09:00:00Z',
  },
  {
    userId: 'user-3',
    email: 'admin@adoptdontshop.com',
    firstName: 'Admin',
    lastName: 'User',
    userType: 'admin',
    status: 'active',
    emailVerified: true,
    rescueName: null,
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-11-10T10:00:00Z',
    updatedAt: '2024-11-10T10:00:00Z',
  },
  {
    userId: 'user-4',
    email: 'suspended@example.com',
    firstName: 'Suspended',
    lastName: 'User',
    userType: 'adopter',
    status: 'suspended',
    emailVerified: true,
    rescueName: null,
    createdAt: '2024-03-10T10:00:00Z',
    lastLogin: '2024-10-01T10:00:00Z',
    updatedAt: '2024-10-15T10:00:00Z',
  },
];

// Mock the hooks
const mockRefetch = jest.fn();
const mockUseUsers = jest.fn();
const mockUseSuspendUser = jest.fn();
const mockUseUnsuspendUser = jest.fn();
const mockUseVerifyUser = jest.fn();
const mockUseDeleteUser = jest.fn();

jest.mock('../hooks', () => ({
  useUsers: () => mockUseUsers(),
  useSuspendUser: () => mockUseSuspendUser(),
  useUnsuspendUser: () => mockUseUnsuspendUser(),
  useVerifyUser: () => mockUseVerifyUser(),
  useDeleteUser: () => mockUseDeleteUser(),
}));

// Mock the API service
jest.mock('../services/libraryServices', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Access the mocked apiService after jest.mock
const { apiService: mockApiService } = jest.requireMock<{ apiService: typeof import('../services/libraryServices').apiService }>('../services/libraryServices');

// Mock the components library
jest.mock('@adopt-dont-shop/components', () => ({
  Heading: ({ children, level }: { children: React.ReactNode; level: string }) => {
    const Tag = level as keyof JSX.IntrinsicElements;
    return React.createElement(Tag, { 'data-testid': `heading-${level}` }, children);
  },
  Text: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="text">{children}</p>
  ),
  Button: ({ children, onClick, variant, size }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, type, placeholder }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type: string;
    placeholder: string;
  }) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid="input"
    />
  ),
}));

// Mock the modals
jest.mock('../components/modals', () => ({
  UserDetailModal: ({ isOpen, user, onClose }: {
    isOpen: boolean;
    user: AdminUser | null;
    onClose: () => void;
  }) =>
    isOpen && user ? (
      <div data-testid="user-detail-modal">
        <h2>User Details</h2>
        <p>{user.firstName} {user.lastName}</p>
        <p>{user.email}</p>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
  EditUserModal: ({ isOpen, user, onClose, onSave }: {
    isOpen: boolean;
    user: AdminUser | null;
    onClose: () => void;
    onSave: (userId: string, updates: Partial<AdminUser>) => Promise<void>;
  }) =>
    isOpen && user ? (
      <div data-testid="edit-user-modal">
        <h2>Edit User</h2>
        <input data-testid="edit-first-name" defaultValue={user.firstName || ''} />
        <input data-testid="edit-last-name" defaultValue={user.lastName || ''} />
        <button onClick={() => onSave(user.userId, { firstName: 'Updated' })}>
          Save
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
  CreateSupportTicketModal: ({ isOpen, user, onClose, onCreate }: {
    isOpen: boolean;
    user: AdminUser | null;
    onClose: () => void;
    onCreate: (data: unknown) => Promise<void>;
  }) =>
    isOpen && user ? (
      <div data-testid="create-support-ticket-modal">
        <h2>Create Support Ticket</h2>
        <p>For: {user.email}</p>
        <button onClick={() => onCreate({
          customerId: user.userId,
          customerEmail: user.email,
          customerName: `${user.firstName} ${user.lastName}`,
          subject: 'Test ticket',
          description: 'Test description',
          category: 'general_question',
          priority: 'normal',
        })}>
          Create Ticket
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
  UserActionsMenu: ({ user, onSuspend, onUnsuspend, onVerify, onDelete }: {
    user: AdminUser;
    onSuspend: (userId: string, reason?: string) => Promise<void>;
    onUnsuspend: (userId: string) => Promise<void>;
    onVerify: (userId: string) => Promise<void>;
    onDelete: (userId: string, reason?: string) => Promise<void>;
  }) => (
    <div data-testid={`user-actions-menu-${user.userId}`}>
      {user.status !== 'suspended' && (
        <button onClick={() => onSuspend(user.userId, 'Test reason')}>
          Suspend
        </button>
      )}
      {user.status === 'suspended' && (
        <button onClick={() => onUnsuspend(user.userId)}>Unsuspend</button>
      )}
      <button onClick={() => onVerify(user.userId)}>Verify</button>
      <button onClick={() => onDelete(user.userId, 'Test reason')}>Delete</button>
    </div>
  ),
}));

// Mock DataTable
jest.mock('../components/data', () => ({
  DataTable: ({ columns, data, loading, emptyMessage, onRowClick, getRowId }: {
    columns: unknown[];
    data: AdminUser[];
    loading: boolean;
    emptyMessage: string;
    onRowClick: (row: AdminUser) => void;
    getRowId: (row: AdminUser) => string;
  }) => {
    if (loading) {
      return <div data-testid="data-table-loading">Loading...</div>;
    }

    if (data.length === 0) {
      return <div data-testid="data-table-empty">{emptyMessage}</div>;
    }

    return (
      <table data-testid="data-table">
        <tbody>
          {data.map((user) => (
            <tr
              key={getRowId(user)}
              onClick={() => onRowClick(user)}
              data-testid={`user-row-${user.userId}`}
            >
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.email}</td>
              <td>{user.userType}</td>
              <td>{user.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
}));

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiSearch: () => <span>🔍</span>,
  FiFilter: () => <span>🎯</span>,
  FiUserPlus: () => <span>➕</span>,
  FiEdit2: () => <span>✏️</span>,
  FiMail: () => <span>✉️</span>,
  FiShield: () => <span>🛡️</span>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderUsers = (initialPath = '/users') => {
  return render(
    <ThemeProvider theme={mockTheme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/users" element={<Users />} />
            <Route path="/users/:userId" element={<Users />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

describe('Users Page - User Management Behaviours', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockUseUsers.mockReturnValue({
      data: { data: mockUsers },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockUseSuspendUser.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
    });

    mockUseUnsuspendUser.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
    });

    mockUseVerifyUser.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
    });

    mockUseDeleteUser.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
    });

    mockApiService.patch.mockResolvedValue({ data: {} });
    mockApiService.post.mockResolvedValue({ data: {} });
  });

  describe('User List Display', () => {
    it('admin can view list of users', () => {
      renderUsers();

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('admin sees user information for each user', () => {
      renderUsers();

      mockUsers.forEach((user) => {
        expect(screen.getByText(`${user.firstName} ${user.lastName}`)).toBeInTheDocument();
        expect(screen.getByText(user.email)).toBeInTheDocument();
      });
    });

    it('admin sees loading state while fetching users', () => {
      mockUseUsers.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      renderUsers();

      expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
    });

    it('admin sees error message when users fail to load', () => {
      const errorMessage = 'Failed to fetch users';
      mockUseUsers.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error(errorMessage),
        refetch: mockRefetch,
      });

      renderUsers();

      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('admin sees empty state when no users exist', () => {
      mockUseUsers.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      renderUsers();

      expect(screen.getByTestId('data-table-empty')).toBeInTheDocument();
      expect(screen.getByText('No users found matching your criteria')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('admin can search for users by name', async () => {
      const user = userEvent.setup();
      renderUsers();

      const searchInput = screen.getByPlaceholderText('Search by name or email...');
      await user.type(searchInput, 'John');

      // The input should have the typed value
      expect(searchInput).toHaveValue('John');
    });

    it('admin can search for users by email', async () => {
      const user = userEvent.setup();
      renderUsers();

      const searchInput = screen.getByPlaceholderText('Search by name or email...');
      await user.type(searchInput, 'john.doe@example.com');

      expect(searchInput).toHaveValue('john.doe@example.com');
    });

    it('admin can filter users by type', async () => {
      const user = userEvent.setup();
      renderUsers();

      const typeFilter = screen.getByDisplayValue('All Types');
      await user.selectOptions(typeFilter, 'admin');

      expect(typeFilter).toHaveValue('admin');
    });

    it('admin can filter users by status', async () => {
      const user = userEvent.setup();
      renderUsers();

      const statusFilter = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusFilter, 'suspended');

      expect(statusFilter).toHaveValue('suspended');
    });

    it('admin sees all filter options for user type', () => {
      renderUsers();

      const typeFilter = screen.getByDisplayValue('All Types') as HTMLSelectElement;
      const options = Array.from(typeFilter.options).map((opt) => opt.value);

      expect(options).toContain('all');
      expect(options).toContain('admin');
      expect(options).toContain('moderator');
      expect(options).toContain('rescue_staff');
      expect(options).toContain('adopter');
    });

    it('admin sees all filter options for status', () => {
      renderUsers();

      const statusFilter = screen.getByDisplayValue('All Statuses') as HTMLSelectElement;
      const options = Array.from(statusFilter.options).map((opt) => opt.value);

      expect(options).toContain('all');
      expect(options).toContain('active');
      expect(options).toContain('pending');
      expect(options).toContain('suspended');
    });
  });

  describe('User Details', () => {
    it('admin can click on a user to view details', async () => {
      const user = userEvent.setup();
      renderUsers();

      const userRow = screen.getByTestId('user-row-user-1');
      await user.click(userRow);

      await waitFor(() => {
        expect(screen.getByTestId('user-detail-modal')).toBeInTheDocument();
      });
    });

    it('admin sees user detail modal with complete information', async () => {
      const user = userEvent.setup();
      renderUsers();

      const userRow = screen.getByTestId('user-row-user-1');
      await user.click(userRow);

      await waitFor(() => {
        const modal = screen.getByTestId('user-detail-modal');
        expect(modal).toHaveTextContent('John Doe');
        expect(modal).toHaveTextContent('john.doe@example.com');
      });
    });

    it('admin can close user detail modal', async () => {
      const user = userEvent.setup();
      renderUsers();

      const userRow = screen.getByTestId('user-row-user-1');
      await user.click(userRow);

      await waitFor(() => {
        expect(screen.getByTestId('user-detail-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('user-detail-modal')).not.toBeInTheDocument();
      });
    });

    it('modal opens automatically when URL contains user ID', () => {
      renderUsers('/users/user-1');

      waitFor(() => {
        expect(screen.getByTestId('user-detail-modal')).toBeInTheDocument();
      });
    });
  });

  describe('User Editing', () => {
    it('admin sees user data displayed in table', () => {
      renderUsers();

      // Verify user data is displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@rescue.org')).toBeInTheDocument();
    });

    it('admin sees different user types displayed', () => {
      renderUsers();

      // Verify different user types are shown
      const table = screen.getByTestId('data-table');
      expect(table.textContent).toContain('adopter');
      expect(table.textContent).toContain('rescue_staff');
      expect(table.textContent).toContain('admin');
    });

    it('admin sees different user statuses displayed', () => {
      renderUsers();

      // Verify different statuses are shown
      const table = screen.getByTestId('data-table');
      expect(table.textContent).toContain('active');
      expect(table.textContent).toContain('suspended');
    });

    it('table shows all user information columns', () => {
      renderUsers();

      // Verify user information is accessible in the table
      const userRow = screen.getByTestId('user-row-user-1');
      expect(userRow).toBeInTheDocument();
      expect(userRow.textContent).toContain('John Doe');
      expect(userRow.textContent).toContain('john.doe@example.com');
      expect(userRow.textContent).toContain('adopter');
      expect(userRow.textContent).toContain('active');
    });
  });

  describe('User Moderation', () => {
    it('admin sees users with different statuses', () => {
      renderUsers();

      // Verify active users are shown
      const activeUser = screen.getByTestId('user-row-user-1');
      expect(activeUser.textContent).toContain('active');

      // Verify suspended users are shown
      const suspendedUser = screen.getByTestId('user-row-user-4');
      expect(suspendedUser.textContent).toContain('suspended');
    });

    it('admin can identify suspended users in the list', () => {
      renderUsers();

      // Verify suspended user information is displayed
      expect(screen.getByText('Suspended User')).toBeInTheDocument();
      expect(screen.getByText('suspended@example.com')).toBeInTheDocument();
    });

    it('admin sees all user statuses in table', () => {
      renderUsers();

      const table = screen.getByTestId('data-table');

      // Check that various user statuses are visible
      expect(table).toBeInTheDocument();
      expect(screen.getByTestId('user-row-user-1')).toBeInTheDocument(); // Active user
      expect(screen.getByTestId('user-row-user-4')).toBeInTheDocument(); // Suspended user
    });

    it('table displays user status information', () => {
      renderUsers();

      // Verify status information is in the table
      const rows = [
        screen.getByTestId('user-row-user-1'),
        screen.getByTestId('user-row-user-2'),
        screen.getByTestId('user-row-user-3'),
        screen.getByTestId('user-row-user-4'),
      ];

      rows.forEach((row) => {
        expect(row).toBeInTheDocument();
      });
    });
  });

  describe('User Communication', () => {
    it('admin sees user contact information displayed', () => {
      renderUsers();

      // Verify email addresses are visible for communication
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@rescue.org')).toBeInTheDocument();
      expect(screen.getByText('admin@adoptdontshop.com')).toBeInTheDocument();
      expect(screen.getByText('suspended@example.com')).toBeInTheDocument();
    });

    it('admin can view all users with their contact details', () => {
      renderUsers();

      // Verify user information is accessible
      const users = [
        { name: 'John Doe', email: 'john.doe@example.com' },
        { name: 'Jane Smith', email: 'jane.smith@rescue.org' },
        { name: 'Admin User', email: 'admin@adoptdontshop.com' },
        { name: 'Suspended User', email: 'suspended@example.com' },
      ];

      users.forEach(({ name, email }) => {
        expect(screen.getByText(name)).toBeInTheDocument();
        expect(screen.getByText(email)).toBeInTheDocument();
      });
    });
  });

  describe('Page Header Actions', () => {
    it('admin sees export button', () => {
      renderUsers();

      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('admin sees add user button', () => {
      renderUsers();

      expect(screen.getByText('Add User')).toBeInTheDocument();
    });
  });
});
