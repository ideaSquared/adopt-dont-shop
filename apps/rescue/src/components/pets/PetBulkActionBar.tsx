import React, { useState } from 'react';
import type { PetStatus } from '@adopt-dont-shop/lib.pets';
import * as styles from './PetBulkActionBar.css';

// ADS-646: bulk-action toolbar for the pet grid. Modelled on the existing
// applications BulkActionBar so the multi-select pattern feels familiar to
// staff who already use the applications page. We surface the two AC
// operations (status change + archive) and a Clear control. Result counts
// surface inline once the parent finishes the bulk write.

type InlineStatus = Extract<PetStatus, 'available' | 'pending' | 'adopted' | 'on_hold'>;

const STATUS_OPTIONS: { value: InlineStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Pending' },
  { value: 'adopted', label: 'Adopted' },
  { value: 'on_hold', label: 'Hold' },
];

export type PetBulkAction = { type: 'status'; status: PetStatus } | { type: 'archive' };

type PetBulkActionBarProps = {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAction: (action: PetBulkAction) => Promise<void>;
  busy?: boolean;
  resultSummary?: { successCount: number; failedCount: number } | null;
};

const PetBulkActionBar: React.FC<PetBulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkAction,
  busy = false,
  resultSummary,
}) => {
  const [pendingStatus, setPendingStatus] = useState<InlineStatus>('available');

  if (selectedCount === 0 && !resultSummary) {
    return null;
  }

  const handleStatusApply = async () => {
    await onBulkAction({ type: 'status', status: pendingStatus });
  };

  const handleArchive = async () => {
    await onBulkAction({ type: 'archive' });
  };

  return (
    <div className={styles.container} role="region" aria-label="Bulk pet actions">
      {selectedCount > 0 && (
        <>
          <span>
            <strong>{selectedCount}</strong> selected
          </span>
          <button type="button" onClick={onClearSelection} disabled={busy}>
            Clear
          </button>
          <span className={styles.spacer} />
          <label className={styles.statusLabel}>
            Set status to{' '}
            <select
              value={pendingStatus}
              onChange={e => setPendingStatus(e.target.value as InlineStatus)}
              disabled={busy}
              aria-label="Bulk status"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleStatusApply}
            disabled={busy}
            className={styles.applyButton}
          >
            {busy ? 'Working…' : 'Apply status'}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={busy}
            className={styles.archiveButton}
          >
            Archive
          </button>
        </>
      )}

      {resultSummary && (
        <span className={styles.fullWidthRow}>
          Bulk action complete: <strong>{resultSummary.successCount}</strong> succeeded,{' '}
          <strong>{resultSummary.failedCount}</strong> failed.
        </span>
      )}
    </div>
  );
};

export default PetBulkActionBar;
