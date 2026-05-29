/**
 * Behaviour tests for PetBulkActionBar (ADS-646).
 *
 * Documents the multi-pet status change + archive flow: the bar only
 * surfaces when at least one pet is selected, the status dropdown
 * defaults to "available", and the two AC actions dispatch the right
 * payload up to the parent.
 */

import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../test-utils/render';
import PetBulkActionBar, { type PetBulkAction } from './PetBulkActionBar';

describe('PetBulkActionBar (ADS-646)', () => {
  it('renders nothing when no pets are selected and no result is pending', () => {
    const { container } = renderWithProviders(
      <PetBulkActionBar
        selectedCount={0}
        onClearSelection={vi.fn()}
        onBulkAction={() => Promise.resolve()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selection count and the action controls when pets are selected', () => {
    renderWithProviders(
      <PetBulkActionBar
        selectedCount={3}
        onClearSelection={vi.fn()}
        onBulkAction={() => Promise.resolve()}
      />
    );

    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /bulk status/i })).toBeInTheDocument();
  });

  it('dispatches the selected status when Apply status is clicked', async () => {
    const user = userEvent.setup();
    const onBulkAction = vi.fn<(action: PetBulkAction) => Promise<void>>(() => Promise.resolve());

    renderWithProviders(
      <PetBulkActionBar selectedCount={2} onClearSelection={vi.fn()} onBulkAction={onBulkAction} />
    );

    await user.selectOptions(screen.getByRole('combobox', { name: /bulk status/i }), 'adopted');
    await user.click(screen.getByRole('button', { name: /apply status/i }));

    expect(onBulkAction).toHaveBeenCalledWith({ type: 'status', status: 'adopted' });
  });

  it('dispatches an archive action when Archive is clicked', async () => {
    const user = userEvent.setup();
    const onBulkAction = vi.fn<(action: PetBulkAction) => Promise<void>>(() => Promise.resolve());

    renderWithProviders(
      <PetBulkActionBar selectedCount={2} onClearSelection={vi.fn()} onBulkAction={onBulkAction} />
    );

    await user.click(screen.getByRole('button', { name: /archive/i }));

    expect(onBulkAction).toHaveBeenCalledWith({ type: 'archive' });
  });

  it('shows a result summary after a bulk action completes', () => {
    renderWithProviders(
      <PetBulkActionBar
        selectedCount={0}
        onClearSelection={vi.fn()}
        onBulkAction={() => Promise.resolve()}
        resultSummary={{ successCount: 4, failedCount: 1 }}
      />
    );

    expect(screen.getByText(/bulk action complete/i)).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('calls onClearSelection when the Clear button is clicked', async () => {
    const user = userEvent.setup();
    const onClearSelection = vi.fn();

    renderWithProviders(
      <PetBulkActionBar
        selectedCount={2}
        onClearSelection={onClearSelection}
        onBulkAction={() => Promise.resolve()}
      />
    );

    await user.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });
});
