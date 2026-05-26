/**
 * Behavioural tests: list pages seed their status filter from the URL
 * `?status=…` query parameter. The Admin Dashboard's KPI cards rely on
 * this for one-click drill-downs.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../test-utils';
import Applications from '../pages/Applications';
import Moderation from '../pages/Moderation';
import Support from '../pages/Support';
import Users from '../pages/Users';
import Pets from '../pages/Pets';

// ── Hooks / services shared by all list pages ─────────────────────────────────

const mockUseApplications = vi.fn();
const mockUseRescuesList = vi.fn();
const mockUseBulkUpdateApplications = vi.fn();
const mockUseUsers = vi.fn();
const mockUsePets = vi.fn();
const mockUseBulkUpdatePets = vi.fn();
const mockUseBulkUpdateUsers = vi.fn();

vi.mock('../hooks', () => ({
  useApplications: (filters: unknown) => mockUseApplications(filters),
  useBulkUpdateApplications: () => mockUseBulkUpdateApplications(),
  useRescuesList: () => mockUseRescuesList(),
  useUsers: (filters: unknown) => mockUseUsers(filters),
  useSuspendUser: () => ({ mutateAsync: vi.fn() }),
  useUnsuspendUser: () => ({ mutateAsync: vi.fn() }),
  useVerifyUser: () => ({ mutateAsync: vi.fn() }),
  useDeleteUser: () => ({ mutateAsync: vi.fn() }),
  useBulkUpdateUsers: () => mockUseBulkUpdateUsers(),
  useCreateUser: () => ({ mutateAsync: vi.fn() }),
  useUserActivity: () => ({ data: [], isLoading: false, error: null }),
  usePets: (filters: unknown) => mockUsePets(filters),
  useBulkUpdatePets: () => mockUseBulkUpdatePets(),
}));

// ── Moderation: mock the lib it depends on ────────────────────────────────────

const mockUseReports = vi.fn();
const mockUseModerationMetrics = vi.fn();
const mockUseReportMutations = vi.fn();

vi.mock('@adopt-dont-shop/lib.moderation', () => ({
  useReports: (filters: unknown) => mockUseReports(filters),
  useModerationMetrics: () => mockUseModerationMetrics(),
  useReportMutations: () => mockUseReportMutations(),
  getSeverityLabel: (s: string) => s,
  getStatusLabel: (s: string) => s,
  formatRelativeTime: () => '2h ago',
}));

// ── Support: mock the lib it depends on ───────────────────────────────────────

const mockUseTickets = vi.fn();
const mockUseTicketStats = vi.fn();
const mockUseTicketMutations = vi.fn();

vi.mock('@adopt-dont-shop/lib.support-tickets', () => ({
  useTickets: (filters: unknown) => mockUseTickets(filters),
  useTicketStats: () => mockUseTicketStats(),
  useTicketMutations: () => mockUseTicketMutations(),
  getStatusLabel: (s: string) => s,
  getPriorityLabel: (s: string) => s,
  getCategoryLabel: (s: string) => s,
  formatRelativeTime: () => '2h ago',
}));

// ── Users page module mocks ───────────────────────────────────────────────────

vi.mock('../services/libraryServices', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../components/modals', () => ({
  UserDetailModal: () => null,
  EditUserModal: () => null,
  AddUserModal: () => null,
  CreateSupportTicketModal: () => null,
  UserActionsMenu: () => null,
  BulkConfirmationModal: () => null,
  ApplicationDetailModal: () => null,
  PetDetailModal: () => null,
}));

vi.mock('../components/modals/TicketDetailModal', () => ({
  TicketDetailModal: () => null,
}));

vi.mock('../components/moderation/ReportDetailModal', () => ({
  ReportDetailModal: () => null,
}));

vi.mock('../components/moderation/ActionSelectionModal', () => ({
  ActionSelectionModal: () => null,
}));

const emptyListResponse = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, pages: 0, totalPages: 0 },
};

const emptyTicketsResponse = {
  data: [],
  pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 20 },
};

beforeEach(() => {
  mockUseApplications.mockReturnValue({
    data: emptyListResponse,
    isLoading: false,
    error: null,
  });
  mockUseBulkUpdateApplications.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mockUseRescuesList.mockReturnValue({ data: { data: [] } });
  mockUseUsers.mockReturnValue({
    data: emptyListResponse,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseBulkUpdateUsers.mockReturnValue({ mutateAsync: vi.fn() });
  mockUsePets.mockReturnValue({
    data: emptyListResponse,
    isLoading: false,
    error: null,
  });
  mockUseBulkUpdatePets.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mockUseReports.mockReturnValue({
    data: emptyListResponse,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseModerationMetrics.mockReturnValue({
    data: { pendingReports: 0, underReviewReports: 0, criticalReports: 0, resolvedReports: 0 },
  });
  mockUseReportMutations.mockReturnValue({
    resolveReport: vi.fn(),
    dismissReport: vi.fn(),
    isLoading: false,
  });
  mockUseTickets.mockReturnValue({
    data: emptyTicketsResponse,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseTicketStats.mockReturnValue({
    data: { open: 0, inProgress: 0, waitingForUser: 0, resolved: 0 },
  });
  mockUseTicketMutations.mockReturnValue({ addResponse: vi.fn() });
});

describe('Applications list page reads ?status= from URL', () => {
  it('seeds the status filter from the URL', async () => {
    renderWithProviders(<Applications />, { initialRoute: '/applications?status=submitted' });
    await waitFor(() => {
      expect(mockUseApplications).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'submitted' })
      );
    });
    expect(screen.getByDisplayValue('Submitted')).toBeInTheDocument();
  });

  it('ignores invalid status values in the URL', async () => {
    renderWithProviders(<Applications />, { initialRoute: '/applications?status=bogus' });
    await waitFor(() => {
      expect(mockUseApplications).toHaveBeenCalled();
    });
    expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
  });

  it('persists status filter change to URL state', async () => {
    renderWithProviders(<Applications />, { initialRoute: '/applications' });
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'approved' } });
    await waitFor(() => {
      expect(mockUseApplications).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' })
      );
    });
  });
});

describe('Moderation list page reads ?status= and ?severity= from URL', () => {
  it('seeds the status filter when only status is provided', async () => {
    renderWithProviders(<Moderation />, { initialRoute: '/moderation?status=pending' });
    await waitFor(() => {
      expect(mockUseReports).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    });
  });

  it('seeds both filters when status and severity are provided', async () => {
    renderWithProviders(<Moderation />, {
      initialRoute: '/moderation?status=pending&severity=critical',
    });
    await waitFor(() => {
      expect(mockUseReports).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', severity: 'critical' })
      );
    });
  });

  it('persists severity filter change to URL state', async () => {
    renderWithProviders(<Moderation />, { initialRoute: '/moderation' });
    const severitySelect = screen.getByLabelText('Severity');
    fireEvent.change(severitySelect, { target: { value: 'high' } });
    await waitFor(() => {
      expect(mockUseReports).toHaveBeenCalledWith(expect.objectContaining({ severity: 'high' }));
    });
  });
});

describe('Support list page reads ?status= from URL', () => {
  it('seeds the status filter from the URL', async () => {
    renderWithProviders(<Support />, { initialRoute: '/support?status=escalated' });
    await waitFor(() => {
      expect(mockUseTickets).toHaveBeenCalledWith(expect.objectContaining({ status: 'escalated' }));
    });
  });

  it('persists status filter change to URL state', async () => {
    renderWithProviders(<Support />, { initialRoute: '/support' });
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'open' } });
    await waitFor(() => {
      expect(mockUseTickets).toHaveBeenCalledWith(expect.objectContaining({ status: 'open' }));
    });
  });
});

describe('Users list page reads ?status= from URL', () => {
  it('seeds the status filter from the URL', async () => {
    renderWithProviders(<Users />, { initialRoute: '/users?status=suspended' });
    await waitFor(() => {
      expect(mockUseUsers).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended' }));
    });
  });
});

describe('Pets list page reads ?status= from URL', () => {
  it('seeds the status filter from the URL', async () => {
    renderWithProviders(<Pets />, { initialRoute: '/pets?status=available' });
    await waitFor(() => {
      expect(mockUsePets).toHaveBeenCalledWith(expect.objectContaining({ status: 'available' }));
    });
  });

  it('persists status filter change to URL state', async () => {
    renderWithProviders(<Pets />, { initialRoute: '/pets' });
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'adopted' } });
    await waitFor(() => {
      expect(mockUsePets).toHaveBeenCalledWith(expect.objectContaining({ status: 'adopted' }));
    });
  });
});
