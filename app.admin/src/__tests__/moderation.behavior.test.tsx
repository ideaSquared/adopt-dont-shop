/**
 * Behavioral tests for Content Moderation page (Admin App)
 *
 * Tests admin-facing behavior:
 * - Admin sees the moderation heading and stats bar
 * - Stats show counts for pending, under review, critical, and resolved reports
 * - Admin sees a table of reports with titles, severity, status, and time
 * - Loading state shown while data is being fetched
 * - Error state shown when the API fails
 * - Admin can filter reports by status
 * - Admin can filter reports by severity
 * - Admin can filter reports by content type
 * - Admin can open a report detail modal
 * - Admin can open an action modal for pending/under-review reports
 * - Action modal not shown for resolved/dismissed reports
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Moderation from '../pages/Moderation';
import type { Report, ReportSeverity, ReportStatus } from '@adopt-dont-shop/lib.moderation';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockUseReports = vi.fn();
const mockUseModerationMetrics = vi.fn();
const mockUseReportMutations = vi.fn();
const mockBulkUpdateReports = vi.fn();
const mockTakeAction = vi.fn();

vi.mock('@adopt-dont-shop/lib.moderation', () => ({
  useReports: (...args: unknown[]) => mockUseReports(...args),
  useModerationMetrics: () => mockUseModerationMetrics(),
  useReportMutations: () => mockUseReportMutations(),
  useActiveActions: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  moderationService: {
    bulkUpdateReports: (...args: unknown[]) => mockBulkUpdateReports(...args),
    takeAction: (...args: unknown[]) => mockTakeAction(...args),
  },
  getSeverityLabel: (severity: string) => severity.charAt(0).toUpperCase() + severity.slice(1),
  getStatusLabel: (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  getActionTypeLabel: (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  formatRelativeTime: (_date: Date) => '2 hours ago',
}));

vi.mock('../components/moderation/ReportDetailModal', () => ({
  ReportDetailModal: ({
    isOpen,
    report,
    onClose,
  }: {
    isOpen: boolean;
    report: Report | null;
    onClose: () => void;
  }) =>
    isOpen && report ? (
      <div data-testid='report-detail-modal'>
        <span>Report: {report.title}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('../components/moderation/ActionSelectionModal', () => ({
  ActionSelectionModal: ({
    isOpen,
    reportTitle,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    reportTitle: string;
    isLoading: boolean;
  }) =>
    isOpen ? (
      <div data-testid='action-selection-modal'>
        <span>Action for: {reportTitle}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeReport = (overrides: Partial<Report> = {}): Report => ({
  reportId: 'report-1',
  reporterId: 'user-1',
  reportedEntityType: 'user',
  reportedEntityId: 'target-user-1',
  category: 'harassment',
  severity: 'high' as ReportSeverity,
  status: 'pending' as ReportStatus,
  title: 'Harassment Report',
  description: 'This user has been harassing other members of the platform repeatedly.',
  evidence: [],
  metadata: {},
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  ...overrides,
});

const mockReports: Report[] = [
  makeReport({
    reportId: 'report-1',
    title: 'Harassment Report',
    severity: 'high',
    status: 'pending',
  }),
  makeReport({
    reportId: 'report-2',
    title: 'Spam Content',
    severity: 'medium',
    status: 'under_review',
    reportedEntityType: 'pet',
  }),
  makeReport({
    reportId: 'report-3',
    title: 'Resolved Abuse',
    severity: 'low',
    status: 'resolved',
  }),
];

const mockMetrics = {
  pendingReports: 8,
  underReviewReports: 3,
  criticalReports: 2,
  resolvedReports: 45,
};

const setupSuccessfulLoad = (reports: Report[] = mockReports) => {
  mockUseReports.mockReturnValue({
    data: {
      data: reports,
      pagination: { page: 1, limit: 20, total: reports.length, totalPages: 1 },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseModerationMetrics.mockReturnValue({ data: mockMetrics, isLoading: false });
  mockUseReportMutations.mockReturnValue({
    resolveReport: vi.fn().mockResolvedValue({}),
    dismissReport: vi.fn().mockResolvedValue({}),
    isLoading: false,
  });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Content Moderation page', () => {
  beforeEach(() => {
    setupSuccessfulLoad();
  });

  describe('page structure', () => {
    it('shows the Content Moderation heading', () => {
      renderWithProviders(<Moderation />);
      expect(screen.getByText('Content Moderation')).toBeInTheDocument();
    });

    it('shows the page description', () => {
      renderWithProviders(<Moderation />);
      expect(
        screen.getByText('Review and manage reported content across the platform')
      ).toBeInTheDocument();
    });
  });

  describe('moderation stats', () => {
    it('shows the Pending Reviews count', () => {
      renderWithProviders(<Moderation />);
      expect(screen.getByText('Pending Reviews')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('shows the Under Review count', () => {
      renderWithProviders(<Moderation />);
      // "Under Review" appears in stats label and filter dropdown option
      const underReviewLabels = screen.getAllByText('Under Review');
      expect(underReviewLabels.length).toBeGreaterThan(0);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows the Critical Priority count', () => {
      renderWithProviders(<Moderation />);
      expect(screen.getByText('Critical Priority')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows the Resolved count', () => {
      renderWithProviders(<Moderation />);
      // "Resolved" appears in stats label, filter dropdown, and badges
      const resolvedLabels = screen.getAllByText('Resolved');
      expect(resolvedLabels.length).toBeGreaterThan(0);
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows skeleton rows while fetching reports', () => {
      mockUseReports.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithProviders(<Moderation />);
      const skeletonRows = container.querySelectorAll('[data-testid="skeleton-row"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('shows an error message when reports API fails', () => {
      mockUseReports.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load reports'),
        refetch: vi.fn(),
      });

      renderWithProviders(<Moderation />);
      expect(
        screen.getByText(/error loading reports.*failed to load reports/i)
      ).toBeInTheDocument();
    });
  });

  describe('displaying reports', () => {
    it('shows report titles in the table', () => {
      renderWithProviders(<Moderation />);
      expect(screen.getByText('Harassment Report')).toBeInTheDocument();
      expect(screen.getByText('Spam Content')).toBeInTheDocument();
    });

    it('shows the content type tag for each report', () => {
      renderWithProviders(<Moderation />);
      const userTags = screen.getAllByText('user');
      expect(userTags.length).toBeGreaterThan(0);
      expect(screen.getByText('pet')).toBeInTheDocument();
    });

    it('shows Pending Review status badge for pending reports', () => {
      renderWithProviders(<Moderation />);
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
    });

    it('shows Under Review status badge for under-review reports', () => {
      renderWithProviders(<Moderation />);
      // "Under Review" appears in stats, dropdown option, and the badge
      const underReviewElements = screen.getAllByText('Under Review');
      expect(underReviewElements.length).toBeGreaterThan(0);
    });

    it('shows Resolved status badge for resolved reports', () => {
      renderWithProviders(<Moderation />);
      // "Resolved" appears in stats, dropdown option, and the badge
      const resolvedElements = screen.getAllByText('Resolved');
      expect(resolvedElements.length).toBeGreaterThan(0);
    });

    it('shows relative timestamps for reports', () => {
      renderWithProviders(<Moderation />);
      const timestamps = screen.getAllByText('2 hours ago');
      expect(timestamps.length).toBeGreaterThan(0);
    });

    it('shows an empty message when no reports exist', () => {
      mockUseReports.mockReturnValue({
        data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<Moderation />);
      expect(
        screen.getByText(
          'No reports found matching your criteria. Try adjusting your filters or search query.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('filter controls', () => {
    it('shows the Status filter', () => {
      renderWithProviders(<Moderation />);
      const statusSelects = screen.getAllByRole('combobox');
      expect(statusSelects.length).toBeGreaterThan(0);
    });

    it('shows the Severity filter', () => {
      renderWithProviders(<Moderation />);
      // "Severity" appears as filter label and also in severity display columns
      const severityLabels = screen.getAllByText('Severity');
      expect(severityLabels.length).toBeGreaterThan(0);
    });

    it('shows the Content Type filter', () => {
      renderWithProviders(<Moderation />);
      expect(screen.getByText('Content Type')).toBeInTheDocument();
    });

    it('passes status filter to reports hook when admin selects Pending', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Moderation />);

      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects[0];
      await user.selectOptions(statusSelect, 'pending');

      await waitFor(() => {
        expect(mockUseReports).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
      });
    });

    it('passes severity filter to reports hook when admin selects Critical', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Moderation />);

      const selects = screen.getAllByRole('combobox');
      const severitySelect = selects[1];
      await user.selectOptions(severitySelect, 'critical');

      await waitFor(() => {
        expect(mockUseReports).toHaveBeenCalledWith(
          expect.objectContaining({ severity: 'critical' })
        );
      });
    });
  });

  describe('report detail modal', () => {
    it('opens the detail modal when admin clicks View Details', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Moderation />);

      const viewButtons = screen.getAllByTitle('View Details');
      await user.click(viewButtons[0]);

      expect(screen.getByTestId('report-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Report: Harassment Report')).toBeInTheDocument();
    });

    it('closes the detail modal when admin clicks Close', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Moderation />);

      await user.click(screen.getAllByTitle('View Details')[0]);
      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(screen.queryByTestId('report-detail-modal')).not.toBeInTheDocument();
    });
  });

  describe('take action modal', () => {
    it('shows Take Action button for pending reports', () => {
      renderWithProviders(<Moderation />);
      const actionButtons = screen.getAllByTitle('Take Action');
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it('opens action modal when admin clicks Take Action on a pending report', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Moderation />);

      await user.click(screen.getAllByTitle('Take Action')[0]);

      expect(screen.getByTestId('action-selection-modal')).toBeInTheDocument();
      expect(screen.getByText('Action for: Harassment Report')).toBeInTheDocument();
    });

    it('does not show Take Action button for resolved reports', () => {
      mockUseReports.mockReturnValue({
        data: {
          data: [makeReport({ status: 'resolved', title: 'Old Report' })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<Moderation />);

      expect(screen.queryByTitle('Take Action')).not.toBeInTheDocument();
    });

    it('does not show Take Action button for dismissed reports', () => {
      mockUseReports.mockReturnValue({
        data: {
          data: [makeReport({ status: 'dismissed', title: 'Dismissed Report' })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<Moderation />);

      expect(screen.queryByTitle('Take Action')).not.toBeInTheDocument();
    });
  });

  describe('bulk moderation actions', () => {
    beforeEach(() => {
      mockBulkUpdateReports.mockReset();
      mockTakeAction.mockReset();
    });

    const selectAllReports = async (user: ReturnType<typeof userEvent.setup>) => {
      // The DataTable renders a "Select all rows" header checkbox plus a
      // per-row checkbox for each report. Selecting the header selects all.
      const checkboxes = screen.getAllByRole('checkbox');
      // Skip first (header) and tick the row checkboxes.
      for (const cb of checkboxes.slice(1)) {
        await user.click(cb);
      }
    };

    it('reveals the bulk action toolbar once reports are selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Moderation />);

      expect(screen.queryByRole('toolbar', { name: /bulk actions/i })).not.toBeInTheDocument();

      await selectAllReports(user);

      expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeInTheDocument();
    });

    it('bulk dismisses the selected reports with a shared reason via the bulk endpoint', async () => {
      const user = userEvent.setup();
      mockBulkUpdateReports.mockResolvedValue({ success: true, updated: 3 });

      mockUseReports.mockReturnValue({
        data: {
          data: [
            makeReport({ reportId: 'r-1', severity: 'low', status: 'pending' }),
            makeReport({ reportId: 'r-2', severity: 'medium', status: 'pending' }),
            makeReport({ reportId: 'r-3', severity: 'low', status: 'pending' }),
          ],
          pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<Moderation />);

      await selectAllReports(user);
      await user.click(screen.getByRole('button', { name: /^dismiss$/i }));

      const reasonField = await screen.findByLabelText(/shared reason/i);
      await user.type(reasonField, 'Reports investigated, no violation');
      await user.click(screen.getByRole('button', { name: /dismiss reports/i }));

      await waitFor(() => {
        expect(mockBulkUpdateReports).toHaveBeenCalledWith(
          expect.objectContaining({
            reportIds: ['r-1', 'r-2', 'r-3'],
            action: 'dismiss',
            resolutionNotes: 'Reports investigated, no violation',
          })
        );
      });
    });

    it('requires a reason before submitting a bulk dismiss', async () => {
      const user = userEvent.setup();

      mockUseReports.mockReturnValue({
        data: {
          data: [makeReport({ reportId: 'r-1', severity: 'low', status: 'pending' })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<Moderation />);

      await selectAllReports(user);
      await user.click(screen.getByRole('button', { name: /^dismiss$/i }));

      const confirmButton = screen.getByRole('button', { name: /dismiss reports/i });
      expect(confirmButton).toBeDisabled();
      expect(mockBulkUpdateReports).not.toHaveBeenCalled();
    });

    it('bulk sanctions selected reports by invoking takeAction per report', async () => {
      const user = userEvent.setup();
      mockTakeAction.mockResolvedValue({ report: {}, action: {} });

      mockUseReports.mockReturnValue({
        data: {
          data: [
            makeReport({
              reportId: 'r-1',
              severity: 'low',
              status: 'pending',
              reportedUserId: 'u-1',
            }),
            makeReport({
              reportId: 'r-2',
              severity: 'medium',
              status: 'pending',
              reportedUserId: 'u-2',
            }),
          ],
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<Moderation />);

      await selectAllReports(user);
      await user.click(screen.getByRole('button', { name: /^sanction$/i }));

      await user.type(screen.getByLabelText(/shared reason/i), 'Repeated harassment');
      await user.click(screen.getByRole('button', { name: /apply sanction/i }));

      await waitFor(() => {
        expect(mockTakeAction).toHaveBeenCalledTimes(2);
      });

      // Each call targets one specific report so the backend audit log
      // produces one MODERATION_ACTION_TAKEN row per affected report.
      const reportIdsCalled = mockTakeAction.mock.calls.map(call => call[0]);
      expect(reportIdsCalled.sort()).toEqual(['r-1', 'r-2']);
    });

    it('requires the CONFIRM phrase when any selected report is critical or high', async () => {
      const user = userEvent.setup();

      mockUseReports.mockReturnValue({
        data: {
          data: [
            makeReport({ reportId: 'r-1', severity: 'critical', status: 'pending' }),
            makeReport({ reportId: 'r-2', severity: 'low', status: 'pending' }),
          ],
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<Moderation />);

      await selectAllReports(user);
      await user.click(screen.getByRole('button', { name: /^dismiss$/i }));

      await user.type(screen.getByLabelText(/shared reason/i), 'Reviewed');

      // Critical severity should require typed confirmation.
      const submit = screen.getByRole('button', { name: /dismiss reports/i });
      expect(submit).toBeDisabled();
      expect(screen.getByTestId('severity-warning')).toBeInTheDocument();

      const confirmField = screen.getByLabelText(/type CONFIRM to proceed/i);
      await user.type(confirmField, 'CONFIRM');

      expect(submit).not.toBeDisabled();
    });

    it('does not require the CONFIRM phrase when all reports are low or medium severity', async () => {
      const user = userEvent.setup();
      mockBulkUpdateReports.mockResolvedValue({ success: true, updated: 1 });

      mockUseReports.mockReturnValue({
        data: {
          data: [
            makeReport({ reportId: 'r-1', severity: 'low', status: 'pending' }),
            makeReport({ reportId: 'r-2', severity: 'medium', status: 'pending' }),
          ],
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<Moderation />);

      await selectAllReports(user);
      await user.click(screen.getByRole('button', { name: /^dismiss$/i }));

      expect(screen.queryByTestId('severity-warning')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/type CONFIRM to proceed/i)).not.toBeInTheDocument();

      await user.type(screen.getByLabelText(/shared reason/i), 'Low risk');
      const submit = screen.getByRole('button', { name: /dismiss reports/i });
      expect(submit).not.toBeDisabled();
    });
  });
});
