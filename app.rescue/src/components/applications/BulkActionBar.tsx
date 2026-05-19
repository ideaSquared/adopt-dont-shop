import React, { useState } from 'react';
import * as styles from './BulkActionBar.css';

type BulkAction = 'approve' | 'reject' | 'withdraw';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAction: (action: BulkAction, reason?: string) => Promise<void>;
  busy?: boolean;
  resultSummary?: { successCount: number; failedCount: number } | null;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkAction,
  busy = false,
  resultSummary,
}) => {
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [reason, setReason] = useState('');

  if (selectedCount === 0 && !resultSummary) {
    return null;
  }

  const requireReason = pendingAction === 'reject';

  const handleConfirm = async () => {
    if (!pendingAction) {
      return;
    }
    await onBulkAction(pendingAction, requireReason ? reason : undefined);
    setPendingAction(null);
    setReason('');
  };

  return (
    <div className={styles.container}>
      {selectedCount > 0 && (
        <>
          <span>
            <strong>{selectedCount}</strong> selected
          </span>
          <button type="button" onClick={onClearSelection} disabled={busy}>
            Clear
          </button>
          <span className={styles.spacer} />
          <button
            type="button"
            onClick={() => setPendingAction('approve')}
            disabled={busy}
            className={styles.approveButton}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setPendingAction('reject')}
            disabled={busy}
            className={styles.rejectButton}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => setPendingAction('withdraw')}
            disabled={busy}
            className={styles.neutralButton}
          >
            Withdraw
          </button>
        </>
      )}

      {resultSummary && (
        <span className={styles.fullWidthRow}>
          Bulk action complete: <strong>{resultSummary.successCount}</strong> succeeded,{' '}
          <strong>{resultSummary.failedCount}</strong> failed.
        </span>
      )}

      {pendingAction && (
        <div className={styles.confirmRow}>
          <span>
            Confirm <strong>{pendingAction}</strong> for {selectedCount} application
            {selectedCount === 1 ? '' : 's'}?
          </span>
          {requireReason && (
            <input
              type="text"
              placeholder="Reason (required for rejection)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className={styles.reasonInput}
            />
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || (requireReason && reason.trim().length === 0)}
            className={styles.neutralButton}
          >
            {busy ? 'Working…' : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingAction(null);
              setReason('');
            }}
            disabled={busy}
            className={styles.neutralButton}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkActionBar;
