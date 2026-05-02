import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import clsx from 'clsx';
import styles from './ActionSelectionModal.css';

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
  duration?: number; // in hours, for suspensions
}

interface ActionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ActionSelectionData) => void;
  reportTitle: string;
  isLoading?: boolean;
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
  no_action: 'Report will be dismissed without any action taken',
  warning_issued: 'User will receive a formal warning',
  content_removed: 'The reported content will be removed from the platform',
  user_suspended: 'User account will be temporarily suspended',
  user_banned: 'User account will be permanently banned',
  account_restricted: 'User will have limited access to certain features',
  content_flagged: 'Content will be flagged for senior moderator review',
};

export const ActionSelectionModal: React.FC<ActionSelectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reportTitle,
  isLoading = false,
}) => {
  const [actionType, setActionType] = useState<ActionType>('no_action');
  const [reason, setReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [duration, setDuration] = useState<number>(24);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      alert('Please provide a reason for this action');
      return;
    }

    const data: ActionSelectionData = {
      actionType,
      reason: reason.trim(),
      internalNotes: internalNotes.trim() || undefined,
    };

    if (actionType === 'user_suspended' && duration) {
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
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.reportInfo}>
              <div className={styles.reportTitle}>Report:</div>
              <div className={styles.reportText}>{reportTitle}</div>
            </div>

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
                  Suspension Duration (hours) *
                </label>
                <input
                  id='duration'
                  className={styles.input}
                  type='number'
                  min='1'
                  max='8760'
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value) || 24)}
                  disabled={isLoading}
                />
                <p className={styles.helpText}>
                  Duration in hours (24 hours = 1 day, 168 hours = 1 week, 720 hours = 30 days)
                </p>
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
