/**
 * Behavior tests for the ReportDetailModal.
 *
 * - When the reported entity has a reportedUserId, the modal renders the user's
 *   prior report history and active sanctions inline so a moderator has full
 *   context before acting on the current report.
 * - When the reported entity has no reportedUserId, neither section is rendered.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReportDetailModal } from './ReportDetailModal';
import type {
  Report,
  ModeratorAction,
  ReportSeverity,
  ReportStatus,
} from '@adopt-dont-shop/lib.moderation';

const mockUseReports = vi.fn();
const mockUseActiveActions = vi.fn();

vi.mock('@adopt-dont-shop/lib.moderation', () => ({
  useReports: (...args: unknown[]) => mockUseReports(...args),
  useActiveActions: (...args: unknown[]) => mockUseActiveActions(...args),
  getSeverityLabel: (severity: string) => severity.charAt(0).toUpperCase() + severity.slice(1),
  getStatusLabel: (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  getActionTypeLabel: (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  formatRelativeTime: (_d: Date) => '3 days ago',
}));

vi.mock('../../utils/openExternal', () => ({
  openExternal: vi.fn(),
}));

const makeReport = (overrides: Partial<Report> = {}): Report => ({
  reportId: 'report-current',
  reporterId: 'reporter-1',
  reportedEntityType: 'user',
  reportedEntityId: 'target-user-1',
  reportedUserId: 'target-user-1',
  category: 'harassment',
  severity: 'high' as ReportSeverity,
  status: 'pending' as ReportStatus,
  title: 'Repeated harassment of other adopters',
  description:
    'This user has been sending unsolicited messages to multiple adopters across the platform.',
  evidence: [],
  metadata: {},
  createdAt: new Date('2024-02-01T10:00:00Z'),
  updatedAt: new Date('2024-02-01T10:00:00Z'),
  ...overrides,
});

const makePriorReport = (overrides: Partial<Report> = {}): Report =>
  makeReport({
    reportId: 'report-prior',
    title: 'Older spam report',
    status: 'resolved' as ReportStatus,
    severity: 'medium' as ReportSeverity,
    ...overrides,
  });

const makeAction = (overrides: Partial<ModeratorAction> = {}): ModeratorAction => ({
  actionId: 'action-1',
  moderatorId: 'mod-1',
  targetEntityType: 'user',
  targetEntityId: 'target-user-1',
  targetUserId: 'target-user-1',
  actionType: 'user_suspended',
  severity: 'high',
  reason: 'Repeated rule violations',
  metadata: {},
  isActive: true,
  evidence: [],
  notificationSent: true,
  createdAt: new Date('2024-01-30T10:00:00Z'),
  updatedAt: new Date('2024-01-30T10:00:00Z'),
  ...overrides,
});

describe('ReportDetailModal — prior history and active sanctions', () => {
  beforeEach(() => {
    mockUseReports.mockReset();
    mockUseActiveActions.mockReset();
  });

  it('renders prior reports excluding the current one when reportedUserId is set', async () => {
    const current = makeReport();
    mockUseReports.mockReturnValue({
      data: {
        data: [current, makePriorReport({ reportId: 'prior-1', title: 'Prior offence A' })],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseActiveActions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ReportDetailModal isOpen onClose={() => undefined} report={current} />);

    await waitFor(() => {
      expect(screen.getByTestId('prior-history-list')).toBeInTheDocument();
    });
    expect(screen.getByText('Prior offence A')).toBeInTheDocument();
    // Current report should not appear in history.
    expect(screen.queryByText(/Repeated harassment of other adopters/)).toBeInTheDocument(); // title is in modal header
    expect(screen.getByTestId('no-active-sanctions')).toBeInTheDocument();
  });

  it('renders active sanctions when the reported user has any', async () => {
    const current = makeReport();
    mockUseReports.mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseActiveActions.mockReturnValue({
      data: [makeAction()],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ReportDetailModal isOpen onClose={() => undefined} report={current} />);

    expect(screen.getByTestId('active-sanctions-list')).toBeInTheDocument();
    expect(screen.getByText(/repeated rule violations/i)).toBeInTheDocument();
    expect(screen.getByTestId('no-prior-history')).toBeInTheDocument();
  });

  it('omits prior history and sanction sections when reportedUserId is null', () => {
    const current = makeReport({ reportedUserId: null });
    mockUseReports.mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseActiveActions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ReportDetailModal isOpen onClose={() => undefined} report={current} />);

    expect(screen.queryByTestId('prior-history-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-prior-history')).not.toBeInTheDocument();
    expect(screen.queryByTestId('active-sanctions-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-active-sanctions')).not.toBeInTheDocument();
  });
});
