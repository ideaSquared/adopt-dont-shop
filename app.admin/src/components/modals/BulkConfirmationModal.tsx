import React, { useState } from 'react';
import * as styles from './BulkConfirmationModal.css';
import { Button } from '@adopt-dont-shop/lib.components';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

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
};

const variantIcon: Record<BulkConfirmationVariant, React.ReactNode> = {
  danger: <FiAlertTriangle />,
  warning: <FiAlertTriangle />,
  info: <FiInfo />,
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
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      return;
    }
    await onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const confirmButtonVariant =
    variant === 'danger' ? 'danger' : variant === 'warning' ? 'primary' : 'primary';

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader({ variant })}>
          <div className={styles.iconWrap({ variant })}>{variantIcon[variant]}</div>
          <div className={styles.headerText}>
            <h3 className={styles.modalTitle}>{title}</h3>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isLoading}
            aria-label='Close'
          >
            <FiX />
          </button>
        </div>

        <div className={styles.modalBody}>
          {resultSummary ? (
            <div className={styles.resultBanner({ hasFailures: resultSummary.failed > 0 })}>
              <FiCheckCircle style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              {resultSummary.succeeded} succeeded
              {resultSummary.failed > 0 && `, ${resultSummary.failed} failed`}
            </div>
          ) : (
            <>
              <p className={styles.description}>{description}</p>
              <div className={styles.countBadge}>
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </div>

              {requireReason && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    {reasonLabel}
                    <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                  </label>
                  <textarea
                    className={styles.textArea}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={reasonPlaceholder}
                    disabled={isLoading}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          {resultSummary ? (
            <Button variant='primary' onClick={onClose}>
              Done
            </Button>
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
          )}
        </div>
      </div>
    </div>
  );
};
