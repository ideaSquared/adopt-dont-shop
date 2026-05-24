import React, { useId, useRef, useEffect, useState } from 'react';
import * as styles from './BulkConfirmationModal.css';
import { Button } from '@adopt-dont-shop/lib.components';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiInfo,
  FiX,
} from 'react-icons/fi';

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
  failedIds,
  onRetryFailed,
  onRetry,
}) => {
  const [reason, setReason] = useState('');
  const [failedIdsExpanded, setFailedIdsExpanded] = useState(false);
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();
  }, [isOpen]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  };

  const confirmButtonVariant =
    variant === 'danger' ? 'danger' : variant === 'warning' ? 'primary' : 'primary';

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className={styles.overlay} onClick={handleOverlayClick}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={modalRef}
        className={styles.modal}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.modalHeader({ variant })}>
          <div className={styles.iconWrap({ variant })}>{variantIcon[variant]}</div>
          <div className={styles.headerText}>
            <h3 id={titleId} className={styles.modalTitle}>
              {title}
            </h3>
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
            <>
              <div className={styles.resultBanner({ hasFailures: resultSummary.failed > 0 })}>
                <FiCheckCircle className={styles.resultIcon} />
                {resultSummary.succeeded} succeeded
                {resultSummary.failed > 0 && `, ${resultSummary.failed} failed`}
              </div>
              {resultSummary.failed > 0 && (
                <p className={styles.failureGuidance}>
                  Some items couldn&apos;t be updated. Close this dialog and check the table for
                  per-row status, or try the action again.
                </p>
              )}
              {failedIds && failedIds.length > 0 && (
                <div className={styles.failedIdsSection}>
                  <button
                    type='button'
                    className={styles.failedIdsToggle}
                    onClick={() => setFailedIdsExpanded(prev => !prev)}
                    aria-expanded={failedIdsExpanded}
                  >
                    {failedIdsExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    {failedIds.length} failed item{failedIds.length !== 1 ? 's' : ''}
                  </button>
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
              <p className={styles.description}>{description}</p>
              <div className={styles.countBadge}>
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </div>

              {requireReason && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    {reasonLabel}
                    <span className={styles.requiredMark}>*</span>
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
            <>
              {resultSummary.failed > 0 && onRetryFailed && failedIds && failedIds.length > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
};
