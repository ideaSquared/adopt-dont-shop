import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ThemeProvider } from '@adopt-dont-shop/components';
import Moderation from './Moderation';
import * as libModeration from '@adopt-dont-shop/lib-moderation';

// Mock the lib-moderation hooks
jest.mock('@adopt-dont-shop/lib-moderation', () => ({
  useReports: jest.fn(),
  useModerationMetrics: jest.fn(),
  useReportMutations: jest.fn(),
  getSeverityLabel: jest.fn((severity: string) => severity),
  getStatusLabel: jest.fn((status: string) => status),
  formatRelativeTime: jest.fn((date: string) => '2 hours ago'),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Moderation Page - Action Selection Modal Integration', () => {
  const mockResolveReport = jest.fn();
  const mockDismissReport = jest.fn();
  const mockRefetch = jest.fn();

  const mockReport = {
    reportId: 'report-1',
    reporterId: 'reporter-1',
    reportedEntityType: 'user' as const,
    reportedEntityId: 'user-123',
    category: 'harassment' as const,
    severity: 'high' as const,
    status: 'pending' as const,
    title: 'User harassing others',
    description: 'This user has been sending harassing messages to multiple users',
    createdAt: '2025-10-31T10:00:00Z',
    updatedAt: '2025-10-31T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (libModeration.useReports as jest.Mock).mockReturnValue({
      data: {
        data: [mockReport],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (libModeration.useModerationMetrics as jest.Mock).mockReturnValue({
      data: {
        pendingReports: 5,
        underReviewReports: 3,
        criticalReports: 2,
        resolvedReports: 100,
      },
    });

    (libModeration.useReportMutations as jest.Mock).mockReturnValue({
      resolveReport: mockResolveReport,
      dismissReport: mockDismissReport,
      isLoading: false,
    });
  });

  it('should render the moderation page with reports', () => {
    render(<Moderation />, { wrapper: createWrapper() });

    expect(screen.getByText('Content Moderation')).toBeInTheDocument();
    expect(screen.getByText('User harassing others')).toBeInTheDocument();
  });

  it('should show Take Action button for pending reports', () => {
    render(<Moderation />, { wrapper: createWrapper() });

    const actionButtons = screen.getAllByTitle('Take Action');
    expect(actionButtons).toHaveLength(1);
  });

  it('should show View Details button for all reports', () => {
    render(<Moderation />, { wrapper: createWrapper() });

    const viewButtons = screen.getAllByTitle('View Details');
    expect(viewButtons).toHaveLength(1);
  });

  it('should open ReportDetailModal when View Details is clicked', async () => {
    render(<Moderation />, { wrapper: createWrapper() });

    const viewButton = screen.getByTitle('View Details');
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('User harassing others')).toBeInTheDocument();
      expect(screen.getByText('Report Status')).toBeInTheDocument();
    });
  });

  it('should close ReportDetailModal when close button is clicked', async () => {
    render(<Moderation />, { wrapper: createWrapper() });

    // Open modal
    const viewButton = screen.getByTitle('View Details');
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Report Status')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Report Status')).not.toBeInTheDocument();
    });
  });

  it('should not show Take Action button for resolved reports', () => {
    const resolvedReport = {
      ...mockReport,
      status: 'resolved' as const,
    };

    (libModeration.useReports as jest.Mock).mockReturnValue({
      data: {
        data: [resolvedReport],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Moderation />, { wrapper: createWrapper() });

    const actionButtons = screen.queryAllByTitle('Take Action');
    expect(actionButtons).toHaveLength(0);
  });

  it('should open ActionSelectionModal when Take Action is clicked', async () => {
    render(<Moderation />, { wrapper: createWrapper() });

    const takeActionButton = screen.getByTitle('Take Action');
    fireEvent.click(takeActionButton);

    await waitFor(() => {
      expect(screen.getByText('Take Moderation Action')).toBeInTheDocument();
      expect(screen.getByText('User harassing others')).toBeInTheDocument();
    });
  });

  it('should close modal when Cancel is clicked', async () => {
    render(<Moderation />, { wrapper: createWrapper() });

    // Open modal
    const takeActionButton = screen.getByTitle('Take Action');
    fireEvent.click(takeActionButton);

    await waitFor(() => {
      expect(screen.getByText('Take Moderation Action')).toBeInTheDocument();
    });

    // Close modal
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Take Moderation Action')).not.toBeInTheDocument();
    });
  });

  it('should dismiss report when No Action is selected', async () => {
    mockDismissReport.mockResolvedValue({});

    render(<Moderation />, { wrapper: createWrapper() });

    // Open modal
    const takeActionButton = screen.getByTitle('Take Action');
    fireEvent.click(takeActionButton);

    await waitFor(() => {
      expect(screen.getByText('Take Moderation Action')).toBeInTheDocument();
    });

    // Select "No Action"
    const actionTypeSelect = screen.getByLabelText('Action Type *');
    fireEvent.change(actionTypeSelect, { target: { value: 'no_action' } });

    // Fill in reason
    const reasonTextarea = screen.getByLabelText('Reason (visible to user) *');
    fireEvent.change(reasonTextarea, { target: { value: 'Not a violation' } });

    // Submit
    const submitButton = screen.getByText('Take Action');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockDismissReport).toHaveBeenCalledWith('report-1', 'Not a violation');
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('should resolve report when Warning is selected', async () => {
    mockResolveReport.mockResolvedValue({});

    render(<Moderation />, { wrapper: createWrapper() });

    // Open modal
    const takeActionButton = screen.getByTitle('Take Action');
    fireEvent.click(takeActionButton);

    await waitFor(() => {
      expect(screen.getByText('Take Moderation Action')).toBeInTheDocument();
    });

    // Select "Issue Warning"
    const actionTypeSelect = screen.getByLabelText('Action Type *');
    fireEvent.change(actionTypeSelect, { target: { value: 'warning_issued' } });

    // Fill in reason
    const reasonTextarea = screen.getByLabelText('Reason (visible to user) *');
    fireEvent.change(reasonTextarea, {
      target: { value: 'Your behavior violates our community guidelines' },
    });

    // Submit
    const submitButton = screen.getByText('Take Action');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockResolveReport).toHaveBeenCalledWith(
        'report-1',
        'Your behavior violates our community guidelines'
      );
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('should show duration field when Suspend User is selected', async () => {
    render(<Moderation />, { wrapper: createWrapper() });

    // Open modal
    const takeActionButton = screen.getByTitle('Take Action');
    fireEvent.click(takeActionButton);

    await waitFor(() => {
      expect(screen.getByText('Take Moderation Action')).toBeInTheDocument();
    });

    // Select "Suspend User"
    const actionTypeSelect = screen.getByLabelText('Action Type *');
    fireEvent.change(actionTypeSelect, { target: { value: 'user_suspended' } });

    // Duration field should appear
    await waitFor(() => {
      expect(screen.getByLabelText('Suspension Duration (hours) *')).toBeInTheDocument();
    });
  });

  it('should display entity context when available', () => {
    const reportWithContext = {
      ...mockReport,
      entityContext: {
        type: 'user',
        id: 'user-123',
        displayName: 'John Doe',
        email: 'john@example.com',
        userType: 'adopter',
      },
    };

    (libModeration.useReports as jest.Mock).mockReturnValue({
      data: {
        data: [reportWithContext],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Moderation />, { wrapper: createWrapper() });

    expect(screen.getByText(/Reported Entity:/)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
  });

  it('should disable buttons while action is loading', async () => {
    (libModeration.useReportMutations as jest.Mock).mockReturnValue({
      resolveReport: mockResolveReport,
      dismissReport: mockDismissReport,
      isLoading: true,
    });

    render(<Moderation />, { wrapper: createWrapper() });

    const takeActionButton = screen.getByTitle('Take Action');
    expect(takeActionButton).toBeDisabled();
  });

  it('should handle pagination correctly', () => {
    const mockUseReports = libModeration.useReports as jest.Mock;

    render(<Moderation />, { wrapper: createWrapper() });

    // Verify initial page is 1
    expect(mockUseReports).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
      })
    );
  });

  it('should filter reports by status', () => {
    const mockUseReports = libModeration.useReports as jest.Mock;

    render(<Moderation />, { wrapper: createWrapper() });

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'pending' } });

    expect(mockUseReports).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'pending',
      })
    );
  });

  it('should filter reports by severity', () => {
    const mockUseReports = libModeration.useReports as jest.Mock;

    render(<Moderation />, { wrapper: createWrapper() });

    const severitySelect = screen.getByLabelText('Severity');
    fireEvent.change(severitySelect, { target: { value: 'critical' } });

    expect(mockUseReports).toHaveBeenLastCalledWith(
      expect.objectContaining({
        severity: 'critical',
      })
    );
  });

  it('should filter reports by entity type', () => {
    const mockUseReports = libModeration.useReports as jest.Mock;

    render(<Moderation />, { wrapper: createWrapper() });

    const entityTypeSelect = screen.getByLabelText('Content Type');
    fireEvent.change(entityTypeSelect, { target: { value: 'user' } });

    expect(mockUseReports).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reportedEntityType: 'user',
      })
    );
  });

  it('should handle search input', () => {
    const mockUseReports = libModeration.useReports as jest.Mock;

    render(<Moderation />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText('Search reports...');
    fireEvent.change(searchInput, { target: { value: 'harassment' } });

    expect(mockUseReports).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'harassment',
      })
    );
  });
});
