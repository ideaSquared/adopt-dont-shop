import React, { useState, useMemo } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import clsx from 'clsx';
import type { ReportSeverity, ActionType, ActionSeverity } from '@adopt-dont-shop/lib.moderation';
import * as styles from './BulkModerationModal.css';

export type BulkModerationActionKind = 'dismiss' | 'sanction';

export type BulkSanctionData = {
  actionType: Extract<
    ActionType,
    'warning_issued' | 'user_suspended' | 'user_banned' | 'account_restricted'
  >;
  severity: ActionSeverity;
};

export type BulkModerationSubmitData = {
  kind: BulkModerationActionKind;
  reason: string;
  sanction?: BulkSanctionData;
};

export type BulkModerationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BulkModerationSubmitData) => void | Promise<void>;
  kind: BulkModerationActionKind;
  selectedCount: number;
  selectedSeverities: ReportSeverity[];
  isLoading?: boolean;
  resultSummary?: { succeeded: number; failed: number } | null;
};

const CONFIRM_PHRASE = 'CONFIRM';

const sanctionActionLabels: Record<BulkSanctionData['actionType'], string> = {
  warning_issued: 'Issue Warning',
  account_restricted: 'Restrict Account',
  user_suspended: 'Suspend User',
  user_banned: 'Ban User Permanently',
};

const determineHighestSeverity = (severities: ReportSeverity[]): ReportSeverity => {
  if (severities.includes('critical')) return 'critical';
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
};

export const BulkModerationModal: React.FC<BulkModerationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  kind,
  selectedCount,
  selectedSeverities,
  isLoading = false,
  resultSummary,
}) => {
  const [reason, setReason] = useState('');
  const [sanctionAction, setSanctionAction] =
    useState<BulkSanctionData['actionType']>('warning_issued');
  const [sanctionSeverity, setSanctionSeverity] = useState<ActionSeverity>('medium');
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const highestSeverity = useMemo(
    () => determineHighestSeverity(selectedSeverities),
    [selectedSeverities]
  );

  const requiresTypedConfirm = highestSeverity === 'critical' || highestSeverity === 'high';

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (isLoading) return;
    setReason('');
    setConfirmPhrase('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    if (requiresTypedConfirm && confirmPhrase.trim() !== CONFIRM_PHRASE) return;

    const data: BulkModerationSubmitData = {
      kind,
      reason: reason.trim(),
    };

    if (kind === 'sanction') {
      data.sanction = {
        actionType: sanctionAction,
        severity: sanctionSeverity,
      };
    }

    await onSubmit(data);
    setReason('');
    setConfirmPhrase('');
  };

  const headerTitle = kind === 'dismiss' ? 'Bulk Dismiss Reports' : 'Bulk Sanction Reports';
  const confirmLabel = kind === 'dismiss' ? 'Dismiss Reports' : 'Apply Sanction';
  const confirmDisabled =
    isLoading ||
    !reason.trim() ||
    (requiresTypedConfirm && confirmPhrase.trim() !== CONFIRM_PHRASE);

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        role='dialog'
        aria-modal='true'
        aria-labelledby='bulk-moderation-title'
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id='bulk-moderation-title' className={styles.title}>
            {headerTitle}
          </h2>
          <button
            type='button'
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isLoading}
            aria-label='Close'
          >
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {resultSummary ? (
              <div
                className={clsx(
                  styles.resultBanner,
                  resultSummary.failed > 0 && styles.resultBannerFailed
                )}
                data-testid='bulk-result'
              >
                {resultSummary.succeeded} succeeded
                {resultSummary.failed > 0 ? `, ${resultSummary.failed} failed` : ''}
              </div>
            ) : (
              <>
                <p className={styles.description}>
                  {kind === 'dismiss'
                    ? 'Dismiss the selected reports with a shared reason. No moderation action against the reported users.'
                    : 'Apply the selected sanction to the reported users for all selected reports. This resolves each affected report.'}
                </p>

                <span className={styles.countBadge} data-testid='bulk-selected-count'>
                  {selectedCount} report{selectedCount !== 1 ? 's' : ''} selected
                </span>

                {requiresTypedConfirm && (
                  <div
                    className={
                      highestSeverity === 'critical'
                        ? styles.severityCritical
                        : styles.severityWarning
                    }
                    data-testid='severity-warning'
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiAlertTriangle />
                      <strong>
                        {highestSeverity === 'critical' ? 'Critical' : 'High'} severity reports
                        selected
                      </strong>
                    </div>
                    <span>
                      Type <code>{CONFIRM_PHRASE}</code> below to confirm this bulk action.
                    </span>
                  </div>
                )}

                {kind === 'sanction' && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label} htmlFor='bulk-sanction-action'>
                        Sanction Type<span className={styles.required}>*</span>
                      </label>
                      <select
                        id='bulk-sanction-action'
                        className={styles.select}
                        value={sanctionAction}
                        onChange={e =>
                          setSanctionAction(e.target.value as BulkSanctionData['actionType'])
                        }
                        disabled={isLoading}
                      >
                        {Object.entries(sanctionActionLabels).map(([value, lbl]) => (
                          <option key={value} value={value}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label} htmlFor='bulk-sanction-severity'>
                        Sanction Severity<span className={styles.required}>*</span>
                      </label>
                      <select
                        id='bulk-sanction-severity'
                        className={styles.select}
                        value={sanctionSeverity}
                        onChange={e => setSanctionSeverity(e.target.value as ActionSeverity)}
                        disabled={isLoading}
                      >
                        <option value='low'>Low</option>
                        <option value='medium'>Medium</option>
                        <option value='high'>High</option>
                        <option value='critical'>Critical</option>
                      </select>
                    </div>
                  </>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor='bulk-reason'>
                    Shared Reason<span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id='bulk-reason'
                    className={styles.textArea}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder='Explain why this bulk action is being taken. The same reason will be recorded on every affected report.'
                    disabled={isLoading}
                    required
                    aria-required={true}
                  />
                  <span className={styles.helpText}>
                    Recorded on every audit log entry produced by this bulk action.
                  </span>
                </div>

                {requiresTypedConfirm && (
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor='bulk-confirm-phrase'>
                      Type <code>{CONFIRM_PHRASE}</code> to proceed
                      <span className={styles.required}>*</span>
                    </label>
                    <input
                      id='bulk-confirm-phrase'
                      className={styles.input}
                      type='text'
                      value={confirmPhrase}
                      onChange={e => setConfirmPhrase(e.target.value)}
                      placeholder={CONFIRM_PHRASE}
                      disabled={isLoading}
                      autoComplete='off'
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.footer}>
            {resultSummary ? (
              <button type='button' className={styles.buttonPrimary} onClick={handleClose}>
                Done
              </button>
            ) : (
              <>
                <button
                  type='button'
                  className={styles.buttonSecondary}
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className={kind === 'dismiss' ? styles.buttonPrimary : styles.buttonDanger}
                  disabled={confirmDisabled}
                >
                  {isLoading ? 'Processing...' : confirmLabel}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
