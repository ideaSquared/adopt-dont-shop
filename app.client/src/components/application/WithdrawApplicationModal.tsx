import { Alert, Button, Modal, Spinner } from '@adopt-dont-shop/lib.components';
import React, { useState } from 'react';
import * as styles from './WithdrawApplicationModal.css';

interface WithdrawApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  petName?: string;
  isLoading?: boolean;
}

export const WithdrawApplicationModal: React.FC<WithdrawApplicationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  petName,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setError(null);
      await onConfirm(reason.trim() || undefined);
      // Reset form on success
      setReason('');
    } catch (err) {
      console.error('Failed to withdraw application:', err);
      setError('Failed to withdraw application. Please try again.');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Withdraw Application'>
      <div className={styles.modalContent}>
        <h2 className={styles.title}>Withdraw Application</h2>

        <p className={styles.description}>
          {petName
            ? `Are you sure you want to withdraw your application for ${petName}?`
            : 'Are you sure you want to withdraw your application?'}
        </p>

        <div className={styles.warningText}>
          <Alert variant='warning' title='Important'>
            This action cannot be undone. Once withdrawn, you will need to submit a new application
            if you change your mind.
          </Alert>
        </div>

        <div className={styles.reasonSection}>
          <label className={styles.label} htmlFor='withdrawal-reason'>
            Reason for withdrawal (optional)
          </label>
          <textarea
            className={styles.textArea}
            id='withdrawal-reason'
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Please let us know why you're withdrawing your application. This helps us improve our process."
            disabled={isLoading}
            maxLength={500}
          />
          <div
            style={{
              fontSize: '0.8rem',
              color: '#666',
              textAlign: 'right',
              marginTop: '0.25rem',
            }}
          >
            {reason.length}/500
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert variant='error' title='Error'>
              {error}
            </Alert>
          </div>
        )}

        <div className={styles.actionButtons}>
          <Button variant='secondary' onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant='primary'
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              backgroundColor: '#dc2626',
              borderColor: '#dc2626',
              color: 'white',
            }}
          >
            {isLoading ? (
              <>
                <Spinner size='sm' style={{ marginRight: '0.5rem' }} />
                Withdrawing...
              </>
            ) : (
              'Withdraw Application'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
