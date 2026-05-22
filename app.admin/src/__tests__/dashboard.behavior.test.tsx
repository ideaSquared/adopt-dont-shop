/**
 * Behavioral tests for Dashboard page (Admin App)
 *
 * Tests admin-facing behavior:
 * - Admin sees the dashboard heading and welcome message
 * - Loading state shown while data is being fetched
 * - Error state shown when the API fails
 * - Admin sees all platform metrics with real data values
 * - Each KPI card is a link to a filtered list view
 * - "Needs your attention" panel surfaces critical reports, oldest pending
 *   application, and escalated support tickets
 * - The "more widgets coming soon" placeholder has been removed
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import Dashboard from '../pages/Dashboard';
import type { PlatformMetrics } from '../services/analyticsService';

const mockUsePlatformMetrics = vi.fn();
const mockUseApplications = vi.fn();
const mockUseReports = vi.fn();
const mockUseTickets = vi.fn();

vi.mock('../hooks', () => ({
  usePlatformMetrics: () => mockUsePlatformMetrics(),
  useApplications: (filters: unknown) => mockUseApplications(filters),
}));

vi.mock('@adopt-dont-shop/lib.moderation', () => ({
  useReports: (filters: unknown) => mockUseReports(filters),
}));

vi.mock('@adopt-dont-shop/lib.support-tickets', () => ({
  useTickets: (filters: unknown) => mockUseTickets(filters),
  formatRelativeTime: () => '2 hours ago',
}));

const mockMetrics: PlatformMetrics = {
  users: {
    total: 5000,
    active: 3200,
    newThisMonth: 120,
    byRole: { adopter: 4500, rescue_staff: 500 },
  },
  rescues: { total: 90, verified: 75, pending: 15, newThisMonth: 3 },
  pets: { total: 800, available: 350, adopted: 42, newThisMonth: 60 },
  applications: { total: 210, pending: 38, approved: 55, newThisMonth: 70 },
};

const setEmptyAttentionData = () => {
  mockUseReports.mockReturnValue({
    data: { data: [], pagination: { page: 1, limit: 3, total: 0, totalPages: 0 } },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseApplications.mockReturnValue({
    data: { data: [], pagination: { page: 1, limit: 1, total: 0, pages: 0 } },
    isLoading: false,
    error: null,
  });
  mockUseTickets.mockReturnValue({
    data: {
      data: [],
      pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 3 },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
};

describe('Dashboard page', () => {
  beforeEach(() => {
    mockUsePlatformMetrics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    setEmptyAttentionData();
  });

  describe('page structure', () => {
    it('shows the Admin Dashboard heading', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('shows a welcome message to the admin', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/welcome back.*here's what's happening/i)).toBeInTheDocument();
    });

    it('does not render the "more widgets coming soon" placeholder', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.queryByText(/more widgets coming soon/i)).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows skeleton cards while data is loading', () => {
      mockUsePlatformMetrics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });
      renderWithProviders(<Dashboard />);
      const busyCards = screen
        .getAllByRole('generic', { hidden: false })
        .filter(el => el.getAttribute('aria-busy') === 'true');
      expect(busyCards.length).toBeGreaterThan(0);
    });

    it('does not show metric values while loading', () => {
      mockUsePlatformMetrics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });
      renderWithProviders(<Dashboard />);
      expect(screen.queryByText('Total Users')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows an error banner when the API call fails', () => {
      mockUsePlatformMetrics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
      });
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load dashboard metrics/i);
    });

    it('displays the error message detail in the banner', () => {
      mockUsePlatformMetrics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
      });
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  describe('platform metrics with live data', () => {
    beforeEach(() => {
      mockUsePlatformMetrics.mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
      });
    });

    it('shows the Total Users metric with real value', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('5,000')).toBeInTheDocument();
    });

    it('shows the Active Rescues metric with real verified count', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Active Rescues')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('shows Pets Listed with available count', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Pets Listed')).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
    });

    it('shows Adoptions (30d) with adopted count', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Adoptions (30d)')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('shows Pending Applications count', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Pending Applications')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
    });

    it('shows new users this month metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('New Users (30d)')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('shows pending verification count as context for rescues', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/15 pending verification/i)).toBeInTheDocument();
    });

    it('shows active users count as context for new users metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/3,200 active users/i)).toBeInTheDocument();
    });
  });

  describe('KPI cards link to filtered list views', () => {
    beforeEach(() => {
      mockUsePlatformMetrics.mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
      });
    });

    it('links Total Users to /users', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('link', { name: /view total users/i })).toHaveAttribute(
        'href',
        '/users'
      );
    });

    it('links Active Rescues to /rescues filtered by verified status', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('link', { name: /view active rescues/i })).toHaveAttribute(
        'href',
        '/rescues?status=verified'
      );
    });

    it('links Pets Listed to /pets filtered by available status', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('link', { name: /view pets listed/i })).toHaveAttribute(
        'href',
        '/pets?status=available'
      );
    });

    it('links Adoptions (30d) to /pets filtered by adopted status', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('link', { name: /view adoptions/i })).toHaveAttribute(
        'href',
        '/pets?status=adopted'
      );
    });

    it('links Pending Applications to /applications filtered by submitted status', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('link', { name: /view pending applications/i })).toHaveAttribute(
        'href',
        '/applications?status=submitted'
      );
    });

    it('links New Users (30d) to /users', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('link', { name: /view new users/i })).toHaveAttribute(
        'href',
        '/users'
      );
    });
  });

  describe('Needs your attention panel', () => {
    beforeEach(() => {
      mockUsePlatformMetrics.mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
      });
    });

    it('renders a section labelled "Needs your attention"', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('region', { name: /needs your attention/i })).toBeInTheDocument();
    });

    it('renders the critical moderation reports subsection', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/critical moderation reports/i)).toBeInTheDocument();
    });

    it('renders the oldest pending application subsection', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/oldest pending application/i)).toBeInTheDocument();
    });

    it('renders the escalated support tickets subsection', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/escalated support tickets/i)).toBeInTheDocument();
    });

    it('queries critical pending reports for the attention panel', () => {
      renderWithProviders(<Dashboard />);
      expect(mockUseReports).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', severity: 'critical', limit: 3 })
      );
    });

    it('queries the oldest submitted application for the attention panel', () => {
      renderWithProviders(<Dashboard />);
      expect(mockUseApplications).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'submitted', limit: 1 })
      );
    });

    it('queries escalated tickets for the attention panel', () => {
      renderWithProviders(<Dashboard />);
      expect(mockUseTickets).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'escalated', limit: 3 })
      );
    });

    it('shows the title of each critical report', () => {
      mockUseReports.mockReturnValue({
        data: {
          data: [
            {
              reportId: 'r1',
              title: 'User threats',
              description: 'desc',
              reportedEntityType: 'user',
              reporterId: 'u1',
              reportedEntityId: 'u2',
              category: 'harassment',
              severity: 'critical',
              status: 'pending',
              evidence: [],
              metadata: {},
              createdAt: new Date('2024-01-15T10:00:00Z'),
              updatedAt: new Date('2024-01-15T10:00:00Z'),
            },
          ],
          pagination: { page: 1, limit: 3, total: 1, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('User threats')).toBeInTheDocument();
    });

    it('shows the oldest pending applicant and pet name', () => {
      mockUseApplications.mockReturnValue({
        data: {
          data: [
            {
              applicationId: 'a1',
              status: 'submitted',
              petId: 'p1',
              petName: 'Rex',
              rescueId: 'rs1',
              rescueName: 'Happy Tails',
              applicantName: 'Jane Doe',
              applicantEmail: 'jane@example.com',
              createdAt: '2024-01-10T00:00:00Z',
              updatedAt: '2024-01-10T00:00:00Z',
            },
          ],
          pagination: { page: 1, limit: 1, total: 1, pages: 1 },
        },
        isLoading: false,
        error: null,
      });
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/jane doe.*rex/i)).toBeInTheDocument();
    });

    it('shows the subject of each escalated ticket', () => {
      mockUseTickets.mockReturnValue({
        data: {
          data: [
            {
              ticketId: 't1',
              userEmail: 'user@example.com',
              status: 'escalated',
              priority: 'high',
              category: 'technical_issue',
              subject: 'Payment failed',
              description: 'Cannot complete adoption',
              tags: [],
              responses: [],
              attachments: [],
              metadata: {},
              createdAt: new Date('2024-01-10T00:00:00Z'),
              updatedAt: new Date('2024-01-15T00:00:00Z'),
            },
          ],
          pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 3 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
    });

    it('shows an empty message in critical reports section when none are pending', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/no critical reports awaiting review/i)).toBeInTheDocument();
    });

    it('shows an empty message in oldest application section when none are pending', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/no pending applications/i)).toBeInTheDocument();
    });

    it('shows an empty message in escalated tickets section when none exist', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/no escalated tickets/i)).toBeInTheDocument();
    });
  });
});
