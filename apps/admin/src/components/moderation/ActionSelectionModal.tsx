import React, { useState } from 'react';
import {
  Alert,
  Button,
  FormField,
  Modal,
  SelectInput,
  TextArea,
  toast,
} from '@adopt-dont-shop/lib.components';
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

const ACTION_TYPES: ReadonlyArray<ActionType> = [
  'no_action',
  'warning_issued',
  'content_removed',
  'user_suspended',
  'user_banned',
  'account_restricted',
  'content_flagged',
];

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

const FORM_ID = 'action-selection-form';

const ACTION_TYPE_OPTIONS = Object.entries(actionTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

const DURATION_SELECT_OPTIONS = DURATION_OPTIONS.map(option => ({
  value: String(option.days),
  label: option.label,
}));

const toActionType = (value: string | string[]): ActionType =>
  ACTION_TYPES.find(type => type === value) ?? 'no_action';

const describeSuspensionEnd = (days: number): string =>
  days === INDEFINITE
    ? 'No expiry date is recorded; the suspension stays until an admin lifts it.'
    : `The recorded expiry date is ${new Date(Date.now() + days * DAY_MS).toLocaleDateString(
        'en-GB',
        { day: 'numeric', month: 'long', year: 'numeric' }
      )}. The account is not reactivated automatically; reactivate the account manually after that date.`;

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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='Take Moderation Action'
      size='md'
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <>
          <Button type='button' variant='outline' onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type='submit' form={FORM_ID} variant='primary' disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Take Action'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <div className={styles.reportInfo}>
          <div className={styles.reportTitle}>Report:</div>
          <div className={styles.reportText}>{reportTitle}</div>
        </div>

        {error && <Alert variant='error'>{error}</Alert>}

        <div className={styles.formGroup}>
          <SelectInput
            label='Action Type'
            data-testid='actionType'
            required
            helperText={actionTypeDescriptions[actionType]}
            value={actionType}
            onChange={value => setActionType(toActionType(value))}
            options={ACTION_TYPE_OPTIONS}
            disabled={isLoading}
            fullWidth
          />
        </div>

        {actionType === 'user_suspended' && (
          <div className={styles.formGroup}>
            <SelectInput
              label='Suspension Duration'
              data-testid='duration'
              required
              helperText={describeSuspensionEnd(duration)}
              value={String(duration)}
              onChange={value => setDuration(parseInt(String(value), 10))}
              options={DURATION_SELECT_OPTIONS}
              disabled={isLoading}
              fullWidth
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <FormField
            label='Reason (visible to user)'
            htmlFor='reason'
            required
            description='This message will be visible to the affected user'
          >
            <TextArea
              id='reason'
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder='Explain why this action is being taken. This will be shown to the user.'
              disabled={isLoading}
              required
              fullWidth
            />
          </FormField>
        </div>

        <div className={styles.formGroup}>
          <FormField
            label='Internal Notes (optional)'
            htmlFor='internalNotes'
            description='These notes are only visible to moderators'
          >
            <TextArea
              id='internalNotes'
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              placeholder='Add any internal notes for other moderators (not visible to users)'
              disabled={isLoading}
              fullWidth
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
};
