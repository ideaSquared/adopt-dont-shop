import React, { useState } from 'react';
import * as styles from './BulkConfirmationModal.css';
import { Button, FormField, Modal, TextArea } from '@adopt-dont-shop/lib.components';
import { ChevronDown, ChevronRight, CircleCheck, Info, TriangleAlert } from 'lucide-react';

export type BulkConfirmationVariant = 'danger' | 'warning' | 'info';

type BulkConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  description: string;
  selectedCount: number;
  confirmLabel: string;
  variant?: BulkConfirmationVariant;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  isLoading?: boolean;
  resultSummary?: { succeeded: number; failed: number } | null;
  failedIds?: ReadonlyArray<string>;
  onRetryFailed?: () => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
};

const variantIcon: Record<BulkConfirmationVariant, React.ReactNode> = {
  danger: <TriangleAlert size='1em' />,
  warning: <TriangleAlert size='1em' />,
  info: <Info size='1em' />,
};

export const BulkConfirmationModal: React.FC<BulkConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  selectedCount,
  confirmLabel,
  variant = 'danger',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter reason...',
  isLoading = false,
  resultSummary,
  failedIds,
  onRetryFailed,
  onRetry,
}) => {
  const [reason, setReason] = useState('');
  const [failedIdsExpanded, setFailedIdsExpanded] = useState(false);

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      return;
    }
    await onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const confirmButtonVariant = variant === 'danger' ? 'danger' : 'primary';
  const failedCount = failedIds?.length ?? 0;
  const hasFailedIds = failedCount > 0;

  const footer = resultSummary ? (
    <>
      {resultSummary.failed > 0 && onRetryFailed && hasFailedIds && (
        <Button variant='outline' onClick={onRetryFailed} disabled={isLoading}>
          {isLoading ? 'Retrying...' : 'Retry failed only'}
        </Button>
      )}
      {resultSummary.failed > 0 && onRetry && (
        <Button variant='outline' onClick={onRetry} disabled={isLoading}>
          {isLoading ? 'Retrying...' : 'Try again'}
        </Button>
      )}
      <Button variant='primary' onClick={onClose}>
        Done
      </Button>
    </>
  ) : (
    <>
      <Button variant='outline' onClick={onClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button
        variant={confirmButtonVariant}
        onClick={handleConfirm}
        disabled={isLoading || (requireReason && !reason.trim())}
      >
        {isLoading ? 'Processing...' : confirmLabel}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size='sm'
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={footer}
    >
      {resultSummary ? (
        <>
          <div className={styles.resultBanner({ hasFailures: resultSummary.failed > 0 })}>
            <CircleCheck size='1em' className={styles.resultIcon} />
            {resultSummary.succeeded} succeeded
            {resultSummary.failed > 0 && `, ${resultSummary.failed} failed`}
          </div>
          {resultSummary.failed > 0 && (
            <p className={styles.failureGuidance}>
              Some items couldn&apos;t be updated. Close this dialog and check the table for per-row
              status, or try the action again.
            </p>
          )}
          {failedIds && hasFailedIds && (
            <div className={styles.failedIdsSection}>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setFailedIdsExpanded(prev => !prev)}
                aria-expanded={failedIdsExpanded}
              >
                {failedIdsExpanded ? <ChevronDown size='1em' /> : <ChevronRight size='1em' />}
                {failedCount} failed item{failedCount !== 1 ? 's' : ''}
              </Button>
              {failedIdsExpanded && (
                <ul className={styles.failedIdsList}>
                  {failedIds.map(id => (
                    <li key={id} className={styles.failedIdItem}>
                      {id}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.descriptionRow}>
            <div className={styles.iconWrap({ variant })}>{variantIcon[variant]}</div>
            <p className={styles.description}>{description}</p>
          </div>
          <div className={styles.countBadge}>
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </div>

          {requireReason && (
            <div className={styles.formGroup}>
              <FormField label={reasonLabel} htmlFor='bulk-confirmation-reason' required>
                <TextArea
                  id='bulk-confirmation-reason'
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={reasonPlaceholder}
                  disabled={isLoading}
                  fullWidth
                />
              </FormField>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
