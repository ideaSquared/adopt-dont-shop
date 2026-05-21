import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BulkActionBar from './BulkActionBar';

describe('BulkActionBar', () => {
  const onClearSelection = vi.fn();
  const onBulkAction = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when nothing is selected and there is no result summary', () => {
    const { container } = render(
      <BulkActionBar
        selectedCount={0}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the selection count and the three action buttons when at least one row is selected', () => {
    render(
      <BulkActionBar
        selectedCount={3}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  });

  it('invokes onBulkAction("approve") without a reason after confirming approve', async () => {
    render(
      <BulkActionBar
        selectedCount={2}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onBulkAction).toHaveBeenCalledWith('approve', undefined);
  });

  it('blocks the reject confirm until a reason is entered', () => {
    render(
      <BulkActionBar
        selectedCount={2}
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
    expect(onBulkAction).toHaveBeenCalledWith('reject', 'duplicate application');
  });

  it('disables all controls when busy is true', () => {
    render(
      <BulkActionBar
        selectedCount={3}
        onClearSelection={onClearSelection}
        onBulkAction={onBulkAction}
        busy
      />
    );
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
  });

  it('renders the result summary when provided', () => {
    render(
      <BulkActionBar
        selectedCount={0}
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
