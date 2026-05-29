/**
 * UX P0/P1 #8: when a moderation action submission fails, the page
 * surfaces the failure as a persistent inline error in the action modal
 * so the user can see the error, retry, or close.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../test-utils';

const resolveReportMock = vi.fn();
const dismissReportMock = vi.fn();
const refetchMock = vi.fn().mockResolvedValue(undefined);

const sampleReport = {
  reportId: 'rep-1',
  reportedUserId: 'user-1',
  reportedEntityId: 'pet-1',
  reportedEntityType: 'pet',
  reportType: 'spam',
  description: 'spammy listing',
  severity: 'medium',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock('@adopt-dont-shop/lib.moderation', () => ({
  useReports: () => ({
    data: {
      data: [sampleReport],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
    },
    isLoading: false,
    error: null,
    refetch: refetchMock,
  }),
  useModerationMetrics: () => ({ data: undefined }),
  useReportMutations: () => ({
    resolveReport: (...args: unknown[]) => resolveReportMock(...args),
    dismissReport: (...args: unknown[]) => dismissReportMock(...args),
    isLoading: false,
  }),
  moderationService: {
    bulkUpdateReports: vi.fn(),
    takeAction: vi.fn(),
  },
  getSeverityLabel: (s: string) => s,
  getStatusLabel: (s: string) => s,
  formatRelativeTime: () => 'just now',
}));

// Replace ActionSelectionModal with a stub that exposes a "submit" button
// firing onSubmit with a deterministic payload, and renders the error prop
// inline so we can assert on it.
vi.mock('../components/moderation/ActionSelectionModal', () => ({
  ActionSelectionModal: ({
    isOpen,
    onSubmit,
    error,
  }: {
    isOpen: boolean;
    onSubmit: (data: { actionType: string; reason: string }) => void;
    error?: string | null;
  }) => {
    if (!isOpen) {
      return null;
    }
    return (
      <div>
        {error && <div role='alert'>{error}</div>}
        <button
          type='button'
          onClick={() => onSubmit({ actionType: 'no_action', reason: 'looked fine' })}
          data-testid='stub-action-submit'
        >
          Submit Action
        </button>
      </div>
    );
  },
}));

vi.mock('../components/moderation/ReportDetailModal', () => ({
  ReportDetailModal: ({
    isOpen,
    report,
    onClose,
  }: {
    isOpen: boolean;
    report: { reportId: string; title: string } | null;
    onClose: () => void;
  }) => {
    if (!isOpen) {
      return null;
    }
    return (
      <div role='dialog' aria-label='Report Detail'>
        <div data-testid='detail-report-id'>{report?.reportId}</div>
        <button type='button' onClick={onClose} data-testid='stub-detail-close'>
          Close
        </button>
      </div>
    );
  },
}));

vi.mock('../components/moderation/BulkModerationModal', () => ({
  BulkModerationModal: () => null,
}));

import Moderation from './Moderation';

const openActionModalForFirstReport = () => {
  // The page row exposes the "Take Action" button via aria-label.
  const takeAction = screen.getAllByRole('button', { name: /take action/i })[0];
  fireEvent.click(takeAction);
};

describe('Moderation handleActionSubmit error feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces an inline error in the modal when the dismiss mutation throws', async () => {
    dismissReportMock.mockRejectedValueOnce(new Error('Server exploded'));

    renderWithProviders(<Moderation />);

    openActionModalForFirstReport();
    fireEvent.click(screen.getByTestId('stub-action-submit'));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/failed to take moderation action/i);
      expect(alert).toHaveTextContent(/server exploded/i);
    });
  });

  it('does not show an inline error when the mutation succeeds', async () => {
    dismissReportMock.mockResolvedValueOnce(undefined);

    renderWithProviders(<Moderation />);

    openActionModalForFirstReport();
    fireEvent.click(screen.getByTestId('stub-action-submit'));

    await waitFor(() => {
      expect(dismissReportMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

const renderModerationAtRoute = (route: string) => {
  return renderWithProviders(
    <Routes>
      <Route path='/moderation' element={<Moderation />} />
      <Route path='/moderation/:reportId' element={<Moderation />} />
    </Routes>,
    { initialRoute: route }
  );
};

describe('Moderation deep-link routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the detail modal for the report when visiting /moderation/:reportId', async () => {
    renderModerationAtRoute('/moderation/rep-1');

    const dialog = await screen.findByRole('dialog', { name: /report detail/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('detail-report-id')).toHaveTextContent('rep-1');
  });

  it('does not open the modal when no reportId is in the URL', () => {
    renderModerationAtRoute('/moderation');

    expect(screen.queryByRole('dialog', { name: /report detail/i })).not.toBeInTheDocument();
  });

  it('navigates to /moderation/:reportId when a report row is clicked', async () => {
    renderModerationAtRoute('/moderation');

    expect(screen.queryByRole('dialog', { name: /report detail/i })).not.toBeInTheDocument();

    // Click the row body — title text is rendered inside the row
    fireEvent.click(screen.getByText(/spammy listing/i));

    const dialog = await screen.findByRole('dialog', { name: /report detail/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('detail-report-id')).toHaveTextContent('rep-1');
  });

  it('closes the modal and returns to /moderation when the close handler fires', async () => {
    renderModerationAtRoute('/moderation/rep-1');

    await screen.findByRole('dialog', { name: /report detail/i });

    fireEvent.click(screen.getByTestId('stub-detail-close'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /report detail/i })).not.toBeInTheDocument();
    });
  });

  it('preserves status filter query params when closing the modal', async () => {
    renderModerationAtRoute('/moderation/rep-1?status=pending');

    await screen.findByRole('dialog', { name: /report detail/i });

    // status filter dropdown reflects the query param
    const statusSelect = screen.getByLabelText(/status/i);
    expect(statusSelect).toHaveValue('pending');

    fireEvent.click(screen.getByTestId('stub-detail-close'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /report detail/i })).not.toBeInTheDocument();
    });

    // After close the filter is still applied
    expect(screen.getByLabelText(/status/i)).toHaveValue('pending');
  });

  it('redirects to /moderation and surfaces a toast when the reportId is unknown', async () => {
    const { toast } = await import('@adopt-dont-shop/lib.components');

    renderModerationAtRoute('/moderation/does-not-exist');

    // No detail dialog rendered
    expect(screen.queryByRole('dialog', { name: /report detail/i })).not.toBeInTheDocument();

    // Soft toast surfaces via the global sonner-backed toast singleton
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Report not found');
    });

    // Page itself still renders (header visible — no crash)
    expect(screen.getByRole('heading', { name: /content moderation/i })).toBeInTheDocument();
  });
});
