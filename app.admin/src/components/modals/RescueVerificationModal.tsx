import React, { useState } from 'react';
import { Button, Heading, Text } from '@adopt-dont-shop/lib.components';
import { FiAlertCircle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import type { AdminRescue, RescueVerificationPayload } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import * as styles from './RescueVerificationModal.css';

type VerificationAction = 'approve' | 'reject';

type RescueVerificationModalProps = {
  rescue: AdminRescue;
  action: VerificationAction;
  onClose: () => void;
  onSuccess: () => void;
};

export const RescueVerificationModal: React.FC<RescueVerificationModalProps> = ({
  rescue,
  action,
  onClose,
  onSuccess,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApproval = action === 'approve';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isApproval && !rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: RescueVerificationPayload = {
        status: isApproval ? 'verified' : 'rejected',
        notes: notes.trim() || undefined,
      };

      if (!isApproval) {
        payload.rejectionReason = rejectionReason.trim();
      }

      if (isApproval) {
        await rescueService.verify(rescue.rescueId, payload);
      } else {
        await rescueService.reject(rescue.rescueId, payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} rescue`);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role='presentation'
    >
      <div className={styles.modalContainer}>
        <form onSubmit={handleSubmit}>
          <div className={isApproval ? styles.modalHeaderApprove : styles.modalHeaderReject}>
            <div className={isApproval ? styles.iconWrapperApprove : styles.iconWrapperReject}>
              {isApproval ? <FiCheckCircle /> : <FiXCircle />}
            </div>
            <div className={styles.headerContent}>
              <Heading level='h3' style={{ margin: 0 }}>
                {isApproval ? 'Approve Rescue' : 'Reject Rescue'}
              </Heading>
              <Text style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                {isApproval
                  ? 'Verify this rescue organization for the platform'
                  : 'Decline this rescue organization application'}
              </Text>
            </div>
          </div>

          <div className={styles.modalBody}>
            {error && (
              <div className={styles.errorMessage}>
                <FiAlertCircle />
                {error}
              </div>
            )}

            <div className={styles.infoBox}>
              <div className={styles.infoLabel}>Rescue Organization</div>
              <div className={styles.infoValue}>{rescue.name}</div>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoLabel}>Email</div>
              <div className={styles.infoValue}>{rescue.email}</div>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoLabel}>Location</div>
              <div className={styles.infoValue}>
                {rescue.city}, {rescue.state}
              </div>
            </div>

            {!isApproval && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor='rejection-reason'>
                  Rejection Reason
                  <span className={styles.requiredIndicator}>*</span>
                </label>
                <textarea
                  id='rejection-reason'
                  className={styles.textArea}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder='Explain why this rescue is being rejected...'
                  required={!isApproval}
                  disabled={loading}
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Internal Notes
                {!isApproval && ' (Optional)'}
              </label>
              <textarea
                className={styles.textArea}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder='Add any internal notes about this decision...'
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type='submit' variant={isApproval ? 'primary' : 'danger'} disabled={loading}>
              {loading ? 'Processing...' : isApproval ? 'Approve Rescue' : 'Reject Rescue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
