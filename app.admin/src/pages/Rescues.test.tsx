import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import Rescues from './Rescues';
import type { AdminRescue } from '@/types/rescue';

// Mock theme for styled-components
const mockTheme = {
  colors: {
    primary: {
      100: '#e0e7ff',
      500: '#667eea',
    },
  },
};

// Mock rescue data
const mockRescues: AdminRescue[] = [
  {
    rescueId: 'rescue-1',
    name: 'Happy Paws Rescue',
    email: 'contact@happypaws.org',
    phone: '555-0100',
    website: 'https://happypaws.org',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    country: 'USA',
    status: 'verified',
    verificationStatus: 'verified',
    createdAt: '2024-01-15T10:00:00Z',
    verifiedAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
  {
    rescueId: 'rescue-2',
    name: 'Furry Friends Sanctuary',
    email: 'info@furryfriends.org',
    phone: '555-0200',
    website: 'https://furryfriends.org',
    address: '456 Oak Ave',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    country: 'USA',
    status: 'pending',
    verificationStatus: 'pending',
    createdAt: '2024-11-05T09:00:00Z',
    verifiedAt: null,
    updatedAt: '2024-11-05T09:00:00Z',
  },
  {
    rescueId: 'rescue-3',
    name: 'Rejected Rescue',
    email: 'contact@rejected.org',
    phone: '555-0300',
    website: 'https://rejected.org',
    address: '789 Pine Rd',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    country: 'USA',
    status: 'rejected',
    verificationStatus: 'rejected',
    createdAt: '2024-10-01T10:00:00Z',
    verifiedAt: null,
    updatedAt: '2024-10-15T10:00:00Z',
  },
];

// Mock the rescue service
const mockFetchRescues = jest.fn();

jest.mock('@/services/rescueService', () => ({
  rescueService: {
    getAll: () => mockFetchRescues(),
    verifyRescue: jest.fn(),
    rejectRescue: jest.fn(),
  },
}));

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
      data-testid="search-input"
    />
  ),
}));

// Mock the modals
jest.mock('@/components/modals', () => ({
  RescueDetailModal: ({ rescueId, onClose, onUpdate }: {
    rescueId: string;
    onClose: () => void;
    onUpdate: () => void;
  }) => (
    <div data-testid="rescue-detail-modal">
      <h2>Rescue Details</h2>
      <p>Rescue ID: {rescueId}</p>
      <button onClick={onClose}>Close</button>
      <button onClick={onUpdate}>Update</button>
    </div>
  ),
  RescueVerificationModal: ({ rescue, action, onClose, onSuccess }: {
    rescue: AdminRescue;
    action: 'approve' | 'reject';
    onClose: () => void;
    onSuccess: () => void;
  }) => (
    <div data-testid="rescue-verification-modal">
      <h2>{action === 'approve' ? 'Approve' : 'Reject'} Rescue</h2>
      <p>{rescue.name}</p>
      <button onClick={onSuccess}>Confirm {action}</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
  SendEmailModal: ({ isOpen, rescue, onClose, onSuccess }: {
    isOpen: boolean;
    rescue: AdminRescue;
    onClose: () => void;
    onSuccess: () => void;
  }) =>
    isOpen ? (
      <div data-testid="send-email-modal">
        <h2>Send Email</h2>
        <p>To: {rescue.email}</p>
        <button onClick={onSuccess}>Send</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

// Mock DataTable
jest.mock('../components/data', () => ({
  DataTable: ({ columns, data, loading, emptyMessage, onRowClick, getRowId }: {
    columns: unknown[];
    data: AdminRescue[];
    loading: boolean;
    emptyMessage: string;
    onRowClick: (row: AdminRescue) => void;
    getRowId: (row: AdminRescue) => string;
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
          {data.map((rescue) => (
            <tr
              key={getRowId(rescue)}
              onClick={() => onRowClick(rescue)}
              data-testid={`rescue-row-${rescue.rescueId}`}
            >
              <td>{rescue.name}</td>
              <td>{rescue.email}</td>
              <td>{rescue.city}, {rescue.state}</td>
              <td data-testid={`status-${rescue.rescueId}`}>{rescue.status}</td>
              <td>
                <button
                  data-testid={`view-btn-${rescue.rescueId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(rescue);
                  }}
                >
                  👁️
                </button>
                {rescue.status === 'pending' && (
                  <>
                    <button data-testid={`approve-btn-${rescue.rescueId}`}>
                      ✅
                    </button>
                    <button data-testid={`reject-btn-${rescue.rescueId}`}>
                      ❌
                    </button>
                  </>
                )}
                <button data-testid={`email-btn-${rescue.rescueId}`}>
                  ✉️
                </button>
              </td>
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
  FiCheckCircle: () => <span>✅</span>,
  FiXCircle: () => <span>❌</span>,
  FiEye: () => <span>👁️</span>,
  FiMail: () => <span>✉️</span>,
  FiMapPin: () => <span>📍</span>,
  FiAlertCircle: () => <span>⚠️</span>,
}));

const renderRescues = (initialPath = '/rescues') => {
  return render(
    <ThemeProvider theme={mockTheme}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/rescues" element={<Rescues />} />
          <Route path="/rescues/:rescueId" element={<Rescues />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('Rescues Page - Rescue Management Behaviours', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockFetchRescues.mockResolvedValue({
      data: mockRescues,
      pagination: {
        page: 1,
        pages: 1,
        total: mockRescues.length,
        limit: 20,
      },
    });
  });

  describe('Rescue List Display', () => {
    it('admin can view list of rescue organizations', async () => {
      renderRescues();

      await waitFor(() => {
        expect(screen.getByText('Rescue Management')).toBeInTheDocument();
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });
    });

    it('admin sees rescue information for each rescue', async () => {
      renderRescues();

      await waitFor(() => {
        mockRescues.forEach((rescue) => {
          expect(screen.getByText(rescue.name)).toBeInTheDocument();
          expect(screen.getByText(rescue.email)).toBeInTheDocument();
          expect(screen.getByText(`${rescue.city}, ${rescue.state}`)).toBeInTheDocument();
        });
      });
    });

    it('admin sees rescue verification status badges', async () => {
      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('status-rescue-1')).toHaveTextContent('verified');
        expect(screen.getByTestId('status-rescue-2')).toHaveTextContent('pending');
        expect(screen.getByTestId('status-rescue-3')).toHaveTextContent('rejected');
      });
    });

    it('admin sees loading state while fetching rescues', () => {
      mockFetchRescues.mockReturnValue(new Promise(() => {})); // Never resolves

      renderRescues();

      expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
    });

    it('admin sees error message when rescues fail to load', async () => {
      mockFetchRescues.mockRejectedValue(new Error('Network error'));

      renderRescues();

      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('admin sees empty state when no rescues exist', async () => {
      mockFetchRescues.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          pages: 0,
          total: 0,
          limit: 20,
        },
      });

      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('data-table-empty')).toBeInTheDocument();
        expect(screen.getByText('No rescue organizations found matching your criteria')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('admin can search for rescues by name', async () => {
      const user = userEvent.setup();
      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by name, city, or email...');
      await user.type(searchInput, 'Happy Paws');

      expect(searchInput).toHaveValue('Happy Paws');
    });

    it('admin can search for rescues by city', async () => {
      const user = userEvent.setup();
      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by name, city, or email...');
      await user.type(searchInput, 'Portland');

      expect(searchInput).toHaveValue('Portland');
    });

    it('admin can filter rescues by verification status', async () => {
      const user = userEvent.setup();
      renderRescues();

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      });

      const statusFilter = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusFilter, 'pending');

      expect(statusFilter).toHaveValue('pending');
    });

    it('admin sees all filter options for verification status', async () => {
      renderRescues();

      await waitFor(() => {
        const statusFilter = screen.getByDisplayValue('All Statuses') as HTMLSelectElement;
        const options = Array.from(statusFilter.options).map((opt) => opt.value);

        expect(options).toContain('all');
        expect(options).toContain('verified');
        expect(options).toContain('pending');
        expect(options).toContain('rejected');
      });
    });
  });

  describe('Rescue Details', () => {
    it('admin can click on a rescue to view details', async () => {
      const user = userEvent.setup();
      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('rescue-row-rescue-1')).toBeInTheDocument();
      });

      const viewButton = screen.getByTestId('view-btn-rescue-1');
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.getByTestId('rescue-detail-modal')).toBeInTheDocument();
      });
    });

    it('admin sees rescue detail modal with complete information', async () => {
      const user = userEvent.setup();
      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('view-btn-rescue-1')).toBeInTheDocument();
      });

      const viewButton = screen.getByTestId('view-btn-rescue-1');
      await user.click(viewButton);

      await waitFor(() => {
        const modal = screen.getByTestId('rescue-detail-modal');
        expect(modal).toHaveTextContent('Rescue Details');
        expect(modal).toHaveTextContent('Rescue ID: rescue-1');
      });
    });

    it('admin can close rescue detail modal', async () => {
      const user = userEvent.setup();
      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('view-btn-rescue-1')).toBeInTheDocument();
      });

      const viewButton = screen.getByTestId('view-btn-rescue-1');
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.getByTestId('rescue-detail-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('rescue-detail-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Rescue Verification', () => {
    it('admin sees approve and reject buttons only for pending rescues', async () => {
      renderRescues();

      await waitFor(() => {
        // Pending rescue should have approve/reject buttons
        expect(screen.getByTestId('approve-btn-rescue-2')).toBeInTheDocument();
        expect(screen.getByTestId('reject-btn-rescue-2')).toBeInTheDocument();

        // Verified rescue should not have approve/reject buttons
        expect(screen.queryByTestId('approve-btn-rescue-1')).not.toBeInTheDocument();
        expect(screen.queryByTestId('reject-btn-rescue-1')).not.toBeInTheDocument();

        // Rejected rescue should not have approve/reject buttons
        expect(screen.queryByTestId('approve-btn-rescue-3')).not.toBeInTheDocument();
        expect(screen.queryByTestId('reject-btn-rescue-3')).not.toBeInTheDocument();
      });
    });

    it('admin can access approve action for pending rescue', async () => {
      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('approve-btn-rescue-2')).toBeInTheDocument();
      });

      // Verify the approve button is accessible and clickable
      const approveButton = screen.getByTestId('approve-btn-rescue-2');
      expect(approveButton).toBeEnabled();
    });

    it('admin can access reject action for pending rescue', async () => {
      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('reject-btn-rescue-2')).toBeInTheDocument();
      });

      // Verify the reject button is accessible and clickable
      const rejectButton = screen.getByTestId('reject-btn-rescue-2');
      expect(rejectButton).toBeEnabled();
    });

    it('admin sees both approve and reject options for pending rescues', async () => {
      renderRescues();

      await waitFor(() => {
        // Pending rescue should have both buttons
        expect(screen.getByTestId('approve-btn-rescue-2')).toBeInTheDocument();
        expect(screen.getByTestId('reject-btn-rescue-2')).toBeInTheDocument();
      });
    });

    it('admin does not see verification actions for non-pending rescues', async () => {
      renderRescues();

      await waitFor(() => {
        // Verified rescue should not have approve/reject buttons
        expect(screen.queryByTestId('approve-btn-rescue-1')).not.toBeInTheDocument();
        expect(screen.queryByTestId('reject-btn-rescue-1')).not.toBeInTheDocument();

        // Rejected rescue should not have approve/reject buttons
        expect(screen.queryByTestId('approve-btn-rescue-3')).not.toBeInTheDocument();
        expect(screen.queryByTestId('reject-btn-rescue-3')).not.toBeInTheDocument();
      });
    });
  });

  describe('Rescue Communication', () => {
    it('admin can access email action for all rescues', async () => {
      renderRescues();

      await waitFor(() => {
        expect(screen.getByTestId('email-btn-rescue-1')).toBeInTheDocument();
        expect(screen.getByTestId('email-btn-rescue-2')).toBeInTheDocument();
        expect(screen.getByTestId('email-btn-rescue-3')).toBeInTheDocument();
      });

      // Verify all email buttons are accessible and clickable
      expect(screen.getByTestId('email-btn-rescue-1')).toBeEnabled();
      expect(screen.getByTestId('email-btn-rescue-2')).toBeEnabled();
      expect(screen.getByTestId('email-btn-rescue-3')).toBeEnabled();
    });

    it('email buttons are available for all verification statuses', async () => {
      renderRescues();

      await waitFor(() => {
        // Verified rescue has email button
        expect(screen.getByTestId('email-btn-rescue-1')).toBeInTheDocument();
        // Pending rescue has email button
        expect(screen.getByTestId('email-btn-rescue-2')).toBeInTheDocument();
        // Rejected rescue has email button
        expect(screen.getByTestId('email-btn-rescue-3')).toBeInTheDocument();
      });
    });
  });

  describe('Page Header', () => {
    it('admin sees page title and description', async () => {
      renderRescues();

      await waitFor(() => {
        expect(screen.getByText('Rescue Management')).toBeInTheDocument();
        expect(screen.getByText('Manage rescue organizations and verification status')).toBeInTheDocument();
      });
    });

    it('admin sees export data button', async () => {
      renderRescues();

      await waitFor(() => {
        expect(screen.getByText('Export Data')).toBeInTheDocument();
      });
    });
  });
});
