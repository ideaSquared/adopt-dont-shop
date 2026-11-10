import React, { useState } from 'react';
import { Button, SelectInput } from '@adopt-dont-shop/lib.components';
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

const toInlineStatus = (value: string | string[]): InlineStatus => {
  const match = STATUS_OPTIONS.find(option => option.value === value);
  return match ? match.value : 'available';
};

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
          <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={busy}>
            Clear
          </Button>
          <span className={styles.spacer} />
          <SelectInput
            label="Set status to"
            value={pendingStatus}
            onChange={value => setPendingStatus(toInlineStatus(value))}
            disabled={busy}
            options={STATUS_OPTIONS}
          />
          <Button variant="primary" size="sm" onClick={handleStatusApply} disabled={busy}>
            {busy ? 'Working…' : 'Apply status'}
          </Button>
          <Button variant="warning" size="sm" onClick={handleArchive} disabled={busy}>
            Archive
          </Button>
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
