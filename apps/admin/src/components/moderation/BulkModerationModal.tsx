import React, { useState, useMemo } from 'react';
import { TriangleAlert } from 'lucide-react';
import clsx from 'clsx';
import {
  Button,
  FormField,
  Input,
  Modal,
  SelectInput,
  TextArea,
} from '@adopt-dont-shop/lib.components';
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
const FORM_ID = 'bulk-moderation-form';

const sanctionActionLabels: Record<BulkSanctionData['actionType'], string> = {
  warning_issued: 'Issue Warning',
  account_restricted: 'Restrict Account',
  user_suspended: 'Suspend User',
  user_banned: 'Ban User Permanently',
};

const SANCTION_ACTIONS: ReadonlyArray<BulkSanctionData['actionType']> = [
  'warning_issued',
  'account_restricted',
  'user_suspended',
  'user_banned',
];

const ACTION_SEVERITIES: ReadonlyArray<ActionSeverity> = ['low', 'medium', 'high', 'critical'];

const SANCTION_ACTION_OPTIONS = SANCTION_ACTIONS.map(value => ({
  value,
  label: sanctionActionLabels[value],
}));

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const toSanctionAction = (value: string | string[]): BulkSanctionData['actionType'] =>
  SANCTION_ACTIONS.find(action => action === value) ?? 'warning_issued';

const toActionSeverity = (value: string | string[]): ActionSeverity =>
  ACTION_SEVERITIES.find(severity => severity === value) ?? 'medium';

const determineHighestSeverity = (severities: ReportSeverity[]): ReportSeverity => {
  if (severities.includes('critical')) {
    return 'critical';
  }
  if (severities.includes('high')) {
    return 'high';
  }
  if (severities.includes('medium')) {
    return 'medium';
  }
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

  const handleClose = () => {
    if (isLoading) {
      return;
    }
    setReason('');
    setConfirmPhrase('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      return;
    }
    if (requiresTypedConfirm && confirmPhrase.trim() !== CONFIRM_PHRASE) {
      return;
    }

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

  const footer = resultSummary ? (
    <Button type='button' variant='primary' onClick={handleClose}>
      Done
    </Button>
  ) : (
    <>
      <Button type='button' variant='outline' onClick={handleClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button
        type='submit'
        form={FORM_ID}
        variant={kind === 'dismiss' ? 'primary' : 'danger'}
        disabled={confirmDisabled}
      >
        {isLoading ? 'Processing...' : confirmLabel}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={headerTitle}
      size='md'
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={footer}
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
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
                  highestSeverity === 'critical' ? styles.severityCritical : styles.severityWarning
                }
                data-testid='severity-warning'
              >
                <div className={styles.severityHeading}>
                  <TriangleAlert size='1em' />
                  <strong>
                    {highestSeverity === 'critical' ? 'Critical' : 'High'} severity reports selected
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
                  <SelectInput
                    label='Sanction Type'
                    data-testid='bulk-sanction-action'
                    required
                    value={sanctionAction}
                    onChange={value => setSanctionAction(toSanctionAction(value))}
                    options={SANCTION_ACTION_OPTIONS}
                    disabled={isLoading}
                    fullWidth
                  />
                </div>

                <div className={styles.formGroup}>
                  <SelectInput
                    label='Sanction Severity'
                    data-testid='bulk-sanction-severity'
                    required
                    value={sanctionSeverity}
                    onChange={value => setSanctionSeverity(toActionSeverity(value))}
                    options={SEVERITY_OPTIONS}
                    disabled={isLoading}
                    fullWidth
                  />
                </div>
              </>
            )}

            <div className={styles.formGroup}>
              <FormField
                label='Shared Reason'
                htmlFor='bulk-reason'
                required
                description='Recorded on every audit log entry produced by this bulk action.'
              >
                <TextArea
                  id='bulk-reason'
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder='Explain why this bulk action is being taken. The same reason will be recorded on every affected report.'
                  disabled={isLoading}
                  required
                  fullWidth
                />
              </FormField>
            </div>

            {requiresTypedConfirm && (
              <div className={styles.formGroup}>
                <FormField
                  label={`Type ${CONFIRM_PHRASE} to proceed`}
                  htmlFor='bulk-confirm-phrase'
                  required
                >
                  <Input
                    id='bulk-confirm-phrase'
                    type='text'
                    value={confirmPhrase}
                    onChange={e => setConfirmPhrase(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    disabled={isLoading}
                    autoComplete='off'
                  />
                </FormField>
              </div>
            )}
          </>
        )}
      </form>
    </Modal>
  );
};
