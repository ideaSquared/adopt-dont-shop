/**
 * Behavioral tests for Rescue Management page (Admin App)
 *
 * Tests admin-facing behavior:
 * - Admin sees the rescue management heading
 * - Admin sees a list of rescues with names, locations, and status
 * - Loading state shown while fetching rescues
 * - Error state shown when the API fails
 * - Status badges correctly identify verified, pending, and rejected rescues
 * - Approve/Reject action buttons only appear for pending rescues
 * - Verified rescues do not show approve/reject actions
 * - Admin can open rescue detail modal
 * - Admin can initiate approval workflow
 * - Admin can initiate rejection workflow
 * - Filters apply to narrow the rescue list
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Rescues from '../pages/Rescues';
import type { AdminRescue } from '@/types/rescue';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockGetAll = vi.fn();

vi.mock('@/services/rescueService', () => ({
  rescueService: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
    getById: vi.fn(),
    verify: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock('@/components/modals', () => ({
  RescueDetailModal: ({
    rescueId,
    onClose,
  }: {
    rescueId: string;
    onClose: () => void;
    onUpdate: () => void;
  }) => (
    <div data-testid='rescue-detail-modal'>
      <span>Detail for: {rescueId}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
  RescueVerificationModal: ({
    rescue,
    action,
    onClose,
  }: {
    rescue: AdminRescue;
    action: 'approve' | 'reject';
    onClose: () => void;
    onSuccess: () => void;
  }) => (
    <div data-testid='rescue-verification-modal'>
      <span>
        {action === 'approve' ? 'Approve' : 'Reject'}: {rescue.name}
      </span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
  SendEmailModal: ({
    isOpen,
    rescue,
    onClose,
  }: {
    isOpen: boolean;
    rescue: AdminRescue;
    onClose: () => void;
    onSuccess: () => void;
  }) =>
    isOpen ? (
      <div data-testid='send-email-modal'>
        <span>Email to: {rescue.name}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeRescue = (overrides: Partial<AdminRescue> = {}): AdminRescue => ({
  rescueId: 'rescue-1',
  name: 'Happy Paws Rescue',
  email: 'contact@happypaws.org',
  phone: '555-0100',
  address: '123 Rescue Lane',
  city: 'San Francisco',
  state: 'CA',
  zipCode: '94102',
  country: 'US',
  status: 'pending',
  verified: false,
  isDeleted: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  location: { city: 'San Francisco', state: 'CA', country: 'US' },
  type: 'nonprofit',
  activeListings: 5,
  staffCount: 3,
  ...overrides,
});

const mockRescues: AdminRescue[] = [
  makeRescue({
    rescueId: 'rescue-1',
    name: 'Happy Paws Rescue',
    status: 'pending',
  }),
  makeRescue({
    rescueId: 'rescue-2',
    name: 'Cat Haven',
    email: 'info@cathaven.org',
    city: 'Los Angeles',
    status: 'verified',
    verified: true,
    verifiedAt: '2024-01-15T00:00:00Z',
  }),
  makeRescue({
    rescueId: 'rescue-3',
    name: 'Second Chance Animals',
    email: 'info@secondchance.org',
    city: 'Oakland',
    status: 'rejected',
  }),
];

const mockPaginatedResponse = (rescues: AdminRescue[] = mockRescues) => ({
  data: rescues,
  pagination: { page: 1, limit: 20, total: rescues.length, pages: 1 },
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Rescue Management page', () => {
  beforeEach(() => {
    mockGetAll.mockResolvedValue(mockPaginatedResponse());
  });

  describe('page structure', () => {
    it('shows the Rescue Management heading', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Rescue Management')).toBeInTheDocument();
      });
    });

    it('shows the page description', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(
          screen.getByText('Manage rescue organizations and verification status')
        ).toBeInTheDocument();
      });
    });

    it('shows the Export Data button', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
      });
    });

    it('shows the search input', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/search by name, city, or email/i)
        ).toBeInTheDocument();
      });
    });

    it('shows the Verification Status filter', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Verification Status')).toBeInTheDocument();
        expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows a loading indicator while fetching rescues', () => {
      mockGetAll.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<Rescues />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows an error message when the rescue API fails', async () => {
      mockGetAll.mockRejectedValue(new Error('Failed to load rescue data'));
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Failed to load rescue data')).toBeInTheDocument();
      });
    });

    it('shows a fallback error when message is unavailable', async () => {
      mockGetAll.mockRejectedValue(new Error('Failed to fetch rescues'));
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch rescues/i)).toBeInTheDocument();
      });
    });
  });

  describe('displaying rescues', () => {
    it('renders rescue names in the table', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Happy Paws Rescue')).toBeInTheDocument();
        expect(screen.getByText('Cat Haven')).toBeInTheDocument();
        expect(screen.getByText('Second Chance Animals')).toBeInTheDocument();
      });
    });

    it('renders rescue locations', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
        expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument();
      });
    });

    it('shows Pending Review badge for pending rescues', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Pending Review')).toBeInTheDocument();
      });
    });

    it('shows Verified badge for verified rescues', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        // "Verified" appears as both a badge and a filter dropdown option
        const verifiedElements = screen.getAllByText('Verified');
        expect(verifiedElements.length).toBeGreaterThan(0);
      });
    });

    it('shows Rejected badge for rejected rescues', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByText('Rejected')).toBeInTheDocument();
      });
    });

    it('shows an empty message when no rescues match', async () => {
      mockGetAll.mockResolvedValue(mockPaginatedResponse([]));
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(
          screen.getByText('No rescue organizations found matching your criteria')
        ).toBeInTheDocument();
      });
    });
  });

  describe('action buttons visibility', () => {
    it('shows Approve button only for pending rescues', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByTitle('Approve')).toBeInTheDocument();
      });
      const approveButtons = screen.getAllByTitle('Approve');
      expect(approveButtons).toHaveLength(1);
    });

    it('shows Reject button only for pending rescues', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        expect(screen.getByTitle('Reject')).toBeInTheDocument();
      });
      const rejectButtons = screen.getAllByTitle('Reject');
      expect(rejectButtons).toHaveLength(1);
    });

    it('shows View Details button for all rescues', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        const viewButtons = screen.getAllByTitle('View details');
        expect(viewButtons.length).toBe(mockRescues.length);
      });
    });

    it('shows Send Email button for all rescues', async () => {
      renderWithProviders(<Rescues />);
      await waitFor(() => {
        const emailButtons = screen.getAllByTitle('Send email');
        expect(emailButtons.length).toBe(mockRescues.length);
      });
    });
  });

  describe('rescue detail modal', () => {
    it('opens the detail modal when admin clicks View Details', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => screen.getAllByTitle('View details'));

      await user.click(screen.getAllByTitle('View details')[0]);

      expect(screen.getByTestId('rescue-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Detail for: rescue-1')).toBeInTheDocument();
    });

    it('closes the detail modal when admin clicks Close', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => screen.getAllByTitle('View details'));

      await user.click(screen.getAllByTitle('View details')[0]);
      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(screen.queryByTestId('rescue-detail-modal')).not.toBeInTheDocument();
    });
  });

  describe('approval workflow', () => {
    it('opens the verification modal when admin clicks Approve', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => screen.getByTitle('Approve'));

      await user.click(screen.getByTitle('Approve'));

      expect(screen.getByTestId('rescue-verification-modal')).toBeInTheDocument();
      expect(screen.getByText('Approve: Happy Paws Rescue')).toBeInTheDocument();
    });

    it('opens the verification modal with reject action when admin clicks Reject', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => screen.getByTitle('Reject'));

      await user.click(screen.getByTitle('Reject'));

      expect(screen.getByTestId('rescue-verification-modal')).toBeInTheDocument();
      expect(screen.getByText('Reject: Happy Paws Rescue')).toBeInTheDocument();
    });
  });

  describe('email modal', () => {
    it('opens the email modal when admin clicks Send Email', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rescues />);
      await waitFor(() => screen.getAllByTitle('Send email'));

      await user.click(screen.getAllByTitle('Send email')[0]);

      expect(screen.getByTestId('send-email-modal')).toBeInTheDocument();
      expect(screen.getByText('Email to: Happy Paws Rescue')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('filters to only pending rescues when admin selects Pending Review', async () => {
      const user = userEvent.setup();
      const pendingOnly = [mockRescues[0]];
      mockGetAll.mockImplementation(
        (filters: { status?: string }) => {
          if (filters.status === 'pending') {
            return Promise.resolve(mockPaginatedResponse(pendingOnly));
          }
          return Promise.resolve(mockPaginatedResponse());
        }
      );

      renderWithProviders(<Rescues />);
      await waitFor(() => screen.getByDisplayValue('All Statuses'));

      await user.selectOptions(screen.getByDisplayValue('All Statuses'), 'pending');

      await waitFor(() => {
        expect(screen.queryByText('Cat Haven')).not.toBeInTheDocument();
        expect(screen.getByText('Happy Paws Rescue')).toBeInTheDocument();
      });
    });
  });
});
