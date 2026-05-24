/**
 * UX P0/P1 #8: when a moderation action submission fails, the page
 * surfaces the failure as a persistent inline error in the action modal
 * so the user can see the error, retry, or close.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
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
  ReportDetailModal: () => null,
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
