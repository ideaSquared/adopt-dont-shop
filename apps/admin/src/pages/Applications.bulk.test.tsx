/**
 * The gateway's PATCH /applications/bulk-update fans out per application and
 * answers 200 with `{ data: { successCount, failureCount, failures } }`, so the
 * page must surface per-item failures rather than report a full success.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import type { AdminApplication } from '../services/applicationService';

const mockUseApplications = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('../hooks', () => ({
  useApplicationById: () => ({ data: undefined, isLoading: false }),
  useApplications: (...args: unknown[]) => mockUseApplications(...args),
  useBulkUpdateApplications: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useRescuesList: () => ({ data: { data: [] } }),
}));

vi.mock('../components/modals', () => ({
  BulkConfirmationModal: ({
    isOpen,
    onConfirm,
    resultSummary,
    failedIds,
  }: {
    isOpen: boolean;
    onConfirm: (reason?: string) => void;
    resultSummary?: { succeeded: number; failed: number } | null;
    failedIds?: ReadonlyArray<string>;
  }) =>
    isOpen ? (
      <div role='dialog' aria-label='Bulk confirmation'>
        <button type='button' onClick={() => onConfirm('batch review')}>
          Confirm bulk
        </button>
        {resultSummary ? (
          <p>
            {resultSummary.succeeded} succeeded, {resultSummary.failed} failed
          </p>
        ) : null}
        {failedIds?.map(id => (
          <span key={id}>failed:{id}</span>
        ))}
      </div>
    ) : null,
}));

import Applications from './Applications';

const buildApplication = (id: string, name: string): AdminApplication => ({
  applicationId: id,
  applicantName: name,
  applicantEmail: `${id}@example.com`,
  petName: 'Rex',
  rescueName: 'Happy Tails',
  status: 'submitted',
  createdAt: new Date('2026-05-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2026-05-01T00:00:00Z').toISOString(),
});

describe('Applications page bulk update result', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockUseApplications.mockReturnValue({
      data: {
        data: [buildApplication('app-1', 'Alice'), buildApplication('app-2', 'Bob')],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
      },
      isLoading: false,
      error: null,
    });
  });

  it('reports partial failures from the gateway result', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      successCount: 1,
      failureCount: 1,
      failures: [{ applicationId: 'app-2', error: 'illegal transition' }],
    });
    const user = userEvent.setup();
    renderWithProviders(<Applications />, { initialRoute: '/applications' });

    await user.click(screen.getAllByRole('checkbox')[0]);
    const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
    await user.click(within(toolbar).getByRole('button', { name: /approve/i }));
    await user.click(screen.getByRole('button', { name: 'Confirm bulk' }));

    expect(await screen.findByText('1 succeeded, 1 failed')).toBeInTheDocument();
    expect(screen.getByText('failed:app-2')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'batch review' })
      )
    );
  });

  it('reports a clean success when nothing failed', async () => {
    mockMutateAsync.mockResolvedValueOnce({ successCount: 2, failureCount: 0, failures: [] });
    const user = userEvent.setup();
    renderWithProviders(<Applications />, { initialRoute: '/applications' });

    await user.click(screen.getAllByRole('checkbox')[0]);
    const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
    await user.click(within(toolbar).getByRole('button', { name: /approve/i }));
    await user.click(screen.getByRole('button', { name: 'Confirm bulk' }));

    expect(await screen.findByText('2 succeeded, 0 failed')).toBeInTheDocument();
  });
});
