import React, { useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { toast } from '@adopt-dont-shop/lib.components';
import * as styles from './ActionSelectionModal.css';

export type ActionType =
  | 'no_action'
  | 'warning_issued'
  | 'content_removed'
  | 'user_suspended'
  | 'user_banned'
  | 'account_restricted'
  | 'content_flagged';

export interface ActionSelectionData {
  actionType: ActionType;
  reason: string;
  internalNotes?: string;
  duration?: number; // in days, for suspensions; omitted when indefinite
}

interface ActionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ActionSelectionData) => void;
  reportTitle: string;
  isLoading?: boolean;
  error?: string | null;
}

const actionTypeLabels: Record<ActionType, string> = {
  no_action: 'No Action Required',
  warning_issued: 'Issue Warning',
  content_removed: 'Remove Content',
  user_suspended: 'Suspend User',
  user_banned: 'Ban User Permanently',
  account_restricted: 'Restrict Account',
  content_flagged: 'Flag Content for Review',
};

const actionTypeDescriptions: Record<ActionType, string> = {
  no_action: 'Dismiss report without taking action',
  warning_issued: 'Issue a formal warning to the user',
  content_removed: 'Remove the reported content from the platform',
  user_suspended: 'Temporarily suspend the user account',
  user_banned: 'Permanently ban the user account',
  account_restricted: 'Limit user access to certain features',
  content_flagged: 'Flag content for senior moderator review',
};

// Suspension length presets, in days. 0 means indefinite (no expiry).
const INDEFINITE = 0;
const DURATION_OPTIONS = [
  { days: 1, label: '1 day' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: INDEFINITE, label: 'Indefinite' },
] as const;
const DEFAULT_DURATION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const describeSuspensionEnd = (days: number): string =>
  days === INDEFINITE
    ? 'The suspension has no end date and stays until it is lifted manually.'
    : `The suspension ends on ${new Date(Date.now() + days * DAY_MS).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}.`;

export const ActionSelectionModal: React.FC<ActionSelectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reportTitle,
  isLoading = false,
  error = null,
}) => {
  const [actionType, setActionType] = useState<ActionType>('no_action');
  const [reason, setReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_DAYS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('Please provide a reason for this action');
      return;
    }

    const data: ActionSelectionData = {
      actionType,
      reason: reason.trim(),
      internalNotes: internalNotes.trim() || undefined,
    };

    if (actionType === 'user_suspended' && duration !== INDEFINITE) {
      data.duration = duration;
    }

    onSubmit(data);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div
      className={clsx(styles.overlay, !isOpen && styles.overlayHidden)}
      onClick={handleClose}
      onKeyDown={e => e.key === 'Escape' && handleClose()}
      role='presentation'
    >
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        role='presentation'
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Take Moderation Action</h2>
          <button className={styles.closeButton} onClick={handleClose} disabled={isLoading}>
            <X size='1em' />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.reportInfo}>
              <div className={styles.reportTitle}>Report:</div>
              <div className={styles.reportText}>{reportTitle}</div>
            </div>

            {error && (
              <div className={styles.inlineError} role='alert'>
                {error}
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor='actionType'>
                Action Type *
              </label>
              <select
                id='actionType'
                className={styles.select}
                value={actionType}
                onChange={e => setActionType(e.target.value as ActionType)}
                disabled={isLoading}
              >
                {Object.entries(actionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className={styles.helpText}>{actionTypeDescriptions[actionType]}</p>
            </div>

            {actionType === 'user_suspended' && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor='duration'>
                  Suspension Duration *
                </label>
                <select
                  id='duration'
                  className={styles.select}
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value, 10))}
                  disabled={isLoading}
                >
                  {DURATION_OPTIONS.map(option => (
                    <option key={option.days} value={option.days}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className={styles.helpText}>{describeSuspensionEnd(duration)}</p>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor='reason'>
                Reason (visible to user) *
              </label>
              <textarea
                id='reason'
                className={styles.textArea}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder='Explain why this action is being taken. This will be shown to the user.'
                disabled={isLoading}
                required
                aria-required={true}
              />
              <p className={styles.helpText}>This message will be visible to the affected user</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor='internalNotes'>
                Internal Notes (optional)
              </label>
              <textarea
                id='internalNotes'
                className={styles.textArea}
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder='Add any internal notes for other moderators (not visible to users)'
                disabled={isLoading}
              />
              <p className={styles.helpText}>These notes are only visible to moderators</p>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type='button'
              className={styles.buttonSecondary}
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button type='submit' className={styles.buttonPrimary} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Take Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
