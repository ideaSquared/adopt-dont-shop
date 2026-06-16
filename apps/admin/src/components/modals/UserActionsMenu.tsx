import React, { useState } from 'react';
import * as styles from './UserActionsMenu.css';
import { Modal, Button } from '@adopt-dont-shop/lib.components';

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  message: string;
  userName: string;
  isDanger?: boolean;
  requiresReason?: boolean;
  confirmButtonText?: string;
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  userName,
  isDanger = false,
  requiresReason = false,
  confirmButtonText = 'Confirm',
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(requiresReason ? reason : undefined);
      setReason('');
      onClose();
    } catch (err) {
      // Keep the modal open and surface the failure — otherwise a rejected
      // destructive action leaves the admin with no feedback (and an
      // unhandled promise rejection), likely to retry blindly.
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size='md'
      centered
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className={styles.confirmationContent}>
        <p className={styles.confirmationMessage}>{message}</p>

        <div className={styles.userInfoBox}>{userName}</div>

        {isDanger && (
          <div className={styles.dangerBox}>
            <strong>Warning:</strong> This action cannot be undone.
          </div>
        )}

        {requiresReason && (
          <div>
            <label htmlFor='reason' className={styles.reasonLabel}>
              Reason {!isDanger && '(Optional)'}
            </label>
            <textarea
              className={styles.reasonTextArea}
              id='reason'
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder='Provide a reason for this action...'
              disabled={isSubmitting}
            />
          </div>
        )}

        {error && (
          <div className={styles.dangerBox} role='alert'>
            {error}
          </div>
        )}

        <div className={styles.buttonGroup}>
          <Button
            type='button'
            variant='outline'
            size='md'
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type='button'
            variant={isDanger ? 'danger' : 'primary'}
            size='md'
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : confirmButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
