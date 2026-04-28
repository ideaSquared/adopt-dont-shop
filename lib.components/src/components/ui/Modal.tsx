import clsx from 'clsx';
import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import * as styles from './Modal.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  'data-testid'?: string;
  centered?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

const CloseIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
  </svg>
);

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  'data-testid': dataTestId,
  centered = true,
  header,
  footer,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const isInitialOpen = useRef(false);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') onClose();
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      if (!isInitialOpen.current) {
        isInitialOpen.current = true;
        setTimeout(() => {
          if (modalRef.current) {
            const focusable = modalRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length > 0) focusable[0].focus();
          }
        }, 0);
      }

      if (closeOnEscape) document.addEventListener('keydown', handleEscape);

      return () => {
        document.body.style.overflow = '';
        if (closeOnEscape) document.removeEventListener('keydown', handleEscape);
      };
    } else {
      isInitialOpen.current = false;
    }
  }, [isOpen, closeOnEscape, handleEscape]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && closeOnEscape) {
      onClose();
      return;
    }
    if (event.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role='button'
      tabIndex={-1}
      aria-label='Close modal'
    >
      <div
        ref={modalRef}
        className={clsx(styles.modalContainer({ size, centered }), className)}
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? 'modal-title' : undefined}
        data-testid={dataTestId}
      >
        {(title || header) && (
          <div className={styles.modalHeader}>
            {header ?? (
              <h2 id='modal-title' className={styles.modalTitle}>
                {title}
              </h2>
            )}
          </div>
        )}

        <div className={styles.modalContent}>{children}</div>

        {showCloseButton && (
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label='Close modal'
            type='button'
          >
            <CloseIcon />
          </button>
        )}

        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

Modal.displayName = 'Modal';
