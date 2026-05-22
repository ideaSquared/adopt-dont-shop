import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import BulkActionBar from './BulkActionBar';
import type { ApplicationListItem } from '../../types/applications';
import type { ApplicationStage } from '../../types/applicationStages';

/**
 * ADS-642: behaviour tests for the stage-aware bulk action bar.
 * Documents the contract the queue depends on:
 *  - each stage transition exposes its own button
 *  - rows that fail preconditions are shown to the user before they
 *    confirm
 *  - rejection captures a shared reason applied to every selected row
 */

const buildApp = (overrides: Partial<ApplicationListItem> & { id: string }): ApplicationListItem =>
  ({
    petId: 'pet-1',
    petName: 'Bella',
    petType: 'Dog',
    petBreed: 'Mix',
    userId: 'user-1',
    rescueId: 'rescue-1',
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: undefined,
    applicantName: `Applicant ${overrides.id}`,
    submittedDaysAgo: 1,
    priority: 'normal',
    referencesStatus: 'pending',
    homeVisitStatus: 'not_scheduled',
    stage: 'PENDING' as ApplicationStage,
    stageProgressPercentage: 10,
    tags: [],
    ...overrides,
  }) as ApplicationListItem;

describe('BulkActionBar (ADS-642)', () => {
  const onClearSelection = vi.fn();
  const onBulkAction = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when nothing is selected and there is no result summary', () => {
    const { container } = render(
      <BulkActionBar
        selectedApplications={[]}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the stage-aware action buttons when at least one row is selected', () => {
    render(
      <BulkActionBar
        selectedApplications={[buildApp({ id: 'a' }), buildApp({ id: 'b' }), buildApp({ id: 'c' })]}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to next stage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  });

  it('advances eligible rows to the next stage and skips resolved rows', async () => {
    const apps = [
      buildApp({ id: 'a', stage: 'PENDING' }),
      buildApp({ id: 'b', stage: 'REVIEWING' }),
      buildApp({ id: 'c', stage: 'RESOLVED' }),
    ];
    render(
      <BulkActionBar
        selectedApplications={apps}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move to next stage' }));

    // Confirmation should show 2 of 3 eligible
    expect(screen.getByText(/2/)).toBeInTheDocument();
    const blocked = screen.getByTestId('bulk-blocked-list');
    expect(within(blocked).getByText(/already resolved/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onBulkAction).toHaveBeenCalledWith('advance', ['a', 'b'], undefined);
  });

  it('blocks approve when the application is not in the DECIDING stage and reports the reason', () => {
    render(
      <BulkActionBar
        selectedApplications={[buildApp({ id: 'a', stage: 'REVIEWING' })]}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    const blocked = screen.getByTestId('bulk-blocked-list');
    expect(within(blocked).getByText(/DECIDING/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('blocks approve when home visit is not completed even in the DECIDING stage', () => {
    render(
      <BulkActionBar
        selectedApplications={[
          buildApp({ id: 'a', stage: 'DECIDING', homeVisitStatus: 'scheduled' }),
        ]}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    const blocked = screen.getByTestId('bulk-blocked-list');
    expect(within(blocked).getByText(/home visit/i)).toBeInTheDocument();
  });

  it('approves a DECIDING application whose home visit is completed', () => {
    render(
      <BulkActionBar
        selectedApplications={[
          buildApp({ id: 'a', stage: 'DECIDING', homeVisitStatus: 'completed' }),
        ]}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onBulkAction).toHaveBeenCalledWith('approve', ['a'], undefined);
  });

  it('blocks the reject confirm until a shared reason is entered and forwards it', () => {
    render(
      <BulkActionBar
        selectedApplications={[
          buildApp({ id: 'a', stage: 'PENDING' }),
          buildApp({ id: 'b', stage: 'REVIEWING' }),
        ]}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    const reasonInput = screen.getByPlaceholderText(/Reason \(required for rejection\)/);
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });

    expect(confirmButton).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: 'duplicate application' } });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onBulkAction).toHaveBeenCalledWith('reject', ['a', 'b'], 'duplicate application');
  });

  it('disables all controls when busy is true', () => {
    render(
      <BulkActionBar
        selectedApplications={[buildApp({ id: 'a' }), buildApp({ id: 'b' }), buildApp({ id: 'c' })]}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
        busy
      />
    );
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move to next stage' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
  });

  it('renders the result summary when provided', () => {
    render(
      <BulkActionBar
        selectedApplications={[]}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
        resultSummary={{ successCount: 7, failedCount: 1 }}
      />
    );
    expect(screen.getByText(/Bulk action complete/)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
