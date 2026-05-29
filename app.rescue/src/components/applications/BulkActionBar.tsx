import React, { useEffect, useMemo, useState } from 'react';
import * as styles from './BulkActionBar.css';
import type { ApplicationListItem } from '../../types/applications';
import { canApplyBulkAction, type BulkStageAction } from '../../utils/applicationStageTransitions';

type BlockedRow = {
  application: ApplicationListItem;
  message: string;
};

export type BulkActionBarProps = {
  selectedApplications: ApplicationListItem[];
  onClearSelection: () => void;
  onBulkAction: (action: BulkStageAction, eligibleIds: string[], reason?: string) => Promise<void>;
  busy?: boolean;
  resultSummary?: { successCount: number; failedCount: number } | null;
  onResultDismiss?: () => void;
};

const ACTION_LABEL: Record<BulkStageAction, string> = {
  advance: 'Move to next stage',
  approve: 'Approve',
  reject: 'Reject',
  withdraw: 'Withdraw',
};

const splitSelection = (action: BulkStageAction, apps: ApplicationListItem[]) => {
  const eligible: ApplicationListItem[] = [];
  const blocked: BlockedRow[] = [];
  for (const app of apps) {
    const result = canApplyBulkAction(action, app);
    if (result.eligible) {
      eligible.push(app);
    } else {
      blocked.push({ application: app, message: result.message });
    }
  }
  return { eligible, blocked };
};

const AUTO_DISMISS_MS = 5000;

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedApplications,
  onClearSelection,
  onBulkAction,
  busy = false,
  resultSummary,
  onResultDismiss,
}) => {
  const selectedCount = selectedApplications.length;
  const [pendingAction, setPendingAction] = useState<BulkStageAction | null>(null);
  const [reason, setReason] = useState('');

  // Auto-dismiss the result summary after a timeout so stale banners
  // don't linger. The parent still controls the actual state — we just
  // fire the callback to let it clear.
  useEffect(() => {
    if (!resultSummary || !onResultDismiss) {
      return;
    }
    const timer = setTimeout(onResultDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [resultSummary, onResultDismiss]);

  const split = useMemo(
    () => (pendingAction ? splitSelection(pendingAction, selectedApplications) : null),
    [pendingAction, selectedApplications]
  );

  if (selectedCount === 0 && !resultSummary) {
    return null;
  }

  const requireReason = pendingAction === 'reject';
  const canConfirm =
    !!split && split.eligible.length > 0 && (!requireReason || reason.trim().length > 0);

  const handleConfirm = async () => {
    if (!pendingAction || !split) {
      return;
    }
    await onBulkAction(
      pendingAction,
      split.eligible.map(a => a.id),
      requireReason ? reason : undefined
    );
    setPendingAction(null);
    setReason('');
  };

  const renderButton = (action: BulkStageAction, className?: string) => (
    <button
      type="button"
      onClick={() => {
        setPendingAction(action);
        setReason('');
      }}
      disabled={busy}
      className={className ?? styles.neutralButton}
    >
      {ACTION_LABEL[action]}
    </button>
  );

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
          {renderButton('advance')}
          {renderButton('approve', styles.approveButton)}
          {renderButton('reject', styles.rejectButton)}
          {renderButton('withdraw')}
        </>
      )}

      {resultSummary && (
        <span className={styles.fullWidthRow}>
          Bulk action complete: <strong>{resultSummary.successCount}</strong> succeeded,{' '}
          <strong>{resultSummary.failedCount}</strong> failed.
          {onResultDismiss && (
            <button type="button" onClick={onResultDismiss} className={styles.neutralButton}>
              Dismiss
            </button>
          )}
        </span>
      )}

      {pendingAction && split && (
        <div className={styles.confirmRow}>
          <span>
            Confirm <strong>{ACTION_LABEL[pendingAction]}</strong> for{' '}
            <strong>{split.eligible.length}</strong> of {selectedCount} application
            {selectedCount === 1 ? '' : 's'}?
          </span>
          {requireReason && (
            <input
              type="text"
              placeholder="Reason (required for rejection)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className={styles.reasonInput}
              required
              aria-required="true"
            />
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !canConfirm}
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
          {split.blocked.length > 0 && (
            <ul
              aria-label="Blocked applications"
              data-testid="bulk-blocked-list"
              className={styles.fullWidthRow}
            >
              {split.blocked.map(b => (
                <li key={b.application.id}>
                  <strong>{b.application.applicantName}</strong>: {b.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkActionBar;
