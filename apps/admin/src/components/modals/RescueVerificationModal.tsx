import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, FormField, Modal, Text, TextArea } from '@adopt-dont-shop/lib.components';
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

const FORM_ID = 'rescue-verification-form';

export const RescueVerificationModal: React.FC<RescueVerificationModalProps> = ({
  rescue,
  action,
  onClose,
  onSuccess,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isApproval = action === 'approve';

  const submission = useMutation({
    mutationFn: (payload: RescueVerificationPayload) =>
      isApproval
        ? rescueService.verify(rescue.rescueId, payload)
        : rescueService.reject(rescue.rescueId, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const loading = submission.isPending;
  const mutationError = submission.error
    ? submission.error instanceof Error
      ? submission.error.message
      : `Failed to ${action} rescue`
    : null;
  const error = validationError ?? mutationError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isApproval && !rejectionReason.trim()) {
      setValidationError('Rejection reason is required');
      return;
    }

    setValidationError(null);
    submission.reset();

    submission.mutate({
      status: isApproval ? 'verified' : 'rejected',
      notes: notes.trim() || undefined,
      ...(isApproval ? {} : { rejectionReason: rejectionReason.trim() }),
    });
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const actionLabel = isApproval ? 'Approve Rescue' : 'Reject Rescue';

  return (
    <Modal
      isOpen
      onClose={handleClose}
      title={actionLabel}
      size='md'
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
      footer={
        <>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type='submit'
            form={FORM_ID}
            variant={isApproval ? 'primary' : 'danger'}
            disabled={loading}
          >
            {loading ? 'Processing...' : actionLabel}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <Text>
          {isApproval
            ? 'Verify this rescue organization for the platform'
            : 'Decline this rescue organization application'}
        </Text>

        {error && <Alert variant='error'>{error}</Alert>}

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
            {rescue.city}
            {rescue.county ? `, ${rescue.county}` : ''}
          </div>
        </div>

        {!isApproval && (
          <FormField label='Rejection Reason' htmlFor='rejection-reason' required>
            <TextArea
              id='rejection-reason'
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder='Explain why this rescue is being rejected...'
              required
              disabled={loading}
              fullWidth
            />
          </FormField>
        )}

        <FormField
          label={isApproval ? 'Internal Notes' : 'Internal Notes (Optional)'}
          htmlFor='rescue-verification-notes'
        >
          <TextArea
            id='rescue-verification-notes'
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder='Add any internal notes about this decision...'
            disabled={loading}
            fullWidth
          />
        </FormField>
      </form>
    </Modal>
  );
};
