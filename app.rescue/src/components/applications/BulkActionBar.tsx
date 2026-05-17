import React, { useState } from 'react';

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
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        background: '#f3f4f6',
        borderRadius: '0.375rem',
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      {selectedCount > 0 && (
        <>
          <span>
            <strong>{selectedCount}</strong> selected
          </span>
          <button type="button" onClick={onClearSelection} disabled={busy}>
            Clear
          </button>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setPendingAction('approve')}
            disabled={busy}
            style={{ background: '#16a34a', color: 'white', padding: '0.25rem 0.75rem' }}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setPendingAction('reject')}
            disabled={busy}
            style={{ background: '#dc2626', color: 'white', padding: '0.25rem 0.75rem' }}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => setPendingAction('withdraw')}
            disabled={busy}
            style={{ padding: '0.25rem 0.75rem' }}
          >
            Withdraw
          </button>
        </>
      )}

      {resultSummary && (
        <span style={{ width: '100%' }}>
          Bulk action complete: <strong>{resultSummary.successCount}</strong> succeeded,{' '}
          <strong>{resultSummary.failedCount}</strong> failed.
        </span>
      )}

      {pendingAction && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            paddingTop: '0.5rem',
            borderTop: '1px solid #d1d5db',
            marginTop: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
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
              style={{ flex: 1, minWidth: '12rem', padding: '0.25rem 0.5rem' }}
            />
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || (requireReason && reason.trim().length === 0)}
            style={{ padding: '0.25rem 0.75rem' }}
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
            style={{ padding: '0.25rem 0.75rem' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkActionBar;
