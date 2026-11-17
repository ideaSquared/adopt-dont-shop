import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, SelectInput } from '@adopt-dont-shop/lib.components';
import * as styles from './BulkActionBar.css';
import type { ApplicationListItem } from '../../types/applications';
import { canApplyBulkAction, type BulkStageAction } from '../../utils/applicationStageTransitions';

// ADS-1463: a fixed set of starter decline-message templates so staff aren't
// stuck free-typing a reason for every bulk rejection. Picking a template
// prefills the (still-editable) reason field; "Custom message" leaves it as
// free text, matching the pre-existing behaviour. Per-rescue template
// management is a larger, separate feature left for later.
const CUSTOM_TEMPLATE_ID = 'custom';

const DECLINE_REASON_TEMPLATES: { value: string; label: string; message: string }[] = [
  { value: CUSTOM_TEMPLATE_ID, label: 'Custom message', message: '' },
  {
    value: 'not_a_fit',
    label: 'Not a good fit for this pet',
    message:
      "After reviewing your application, we don't feel this is the right match for you and this pet. We encourage you to apply for other pets in our care.",
  },
  {
    value: 'incomplete',
    label: 'Application incomplete',
    message:
      'We were unable to verify some of the information in your application. Please feel free to re-apply with complete details.',
  },
  {
    value: 'pet_unavailable',
    label: 'Pet no longer available',
    message:
      'This pet has already been adopted by another applicant. Thank you for your interest — please check our other available pets.',
  },
];

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
  const [templateId, setTemplateId] = useState(CUSTOM_TEMPLATE_ID);

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
    setTemplateId(CUSTOM_TEMPLATE_ID);
  };

  const renderButton = (action: BulkStageAction, variant: 'secondary' | 'success' | 'danger') => (
    <Button
      size="sm"
      variant={variant}
      onClick={() => {
        setPendingAction(action);
        setReason('');
        setTemplateId(CUSTOM_TEMPLATE_ID);
      }}
      disabled={busy}
    >
      {ACTION_LABEL[action]}
    </Button>
  );

  return (
    <div className={styles.container} role="toolbar" aria-label="Bulk actions">
      {selectedCount > 0 && (
        <>
          <span>
            <strong>{selectedCount}</strong> selected
          </span>
          <Button size="sm" variant="ghost" onClick={onClearSelection} disabled={busy}>
            Clear
          </Button>
          <span className={styles.spacer} />
          {renderButton('advance', 'secondary')}
          {renderButton('approve', 'success')}
          {renderButton('reject', 'danger')}
          {renderButton('withdraw', 'secondary')}
        </>
      )}

      {resultSummary && (
        <span className={styles.fullWidthRow}>
          Bulk action complete: <strong>{resultSummary.successCount}</strong> succeeded,{' '}
          <strong>{resultSummary.failedCount}</strong> failed.
          {onResultDismiss && (
            <Button size="sm" variant="secondary" onClick={onResultDismiss}>
              Dismiss
            </Button>
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
            <>
              <SelectInput
                label="Decline reason template"
                value={templateId}
                onChange={value => {
                  const id = Array.isArray(value) ? value[0] : value;
                  setTemplateId(id);
                  const template = DECLINE_REASON_TEMPLATES.find(t => t.value === id);
                  if (template && template.value !== CUSTOM_TEMPLATE_ID) {
                    setReason(template.message);
                  }
                }}
                options={DECLINE_REASON_TEMPLATES.map(({ value, label }) => ({ value, label }))}
                className={styles.templateSelect}
              />
              <Input
                type="text"
                aria-label="Reason for rejection"
                placeholder="Reason (required for rejection)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className={styles.reasonInput}
                required
                aria-required="true"
              />
            </>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleConfirm}
            disabled={busy || !canConfirm}
          >
            {busy ? 'Working…' : 'Confirm'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPendingAction(null);
              setReason('');
              setTemplateId(CUSTOM_TEMPLATE_ID);
            }}
            disabled={busy}
          >
            Cancel
          </Button>
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
