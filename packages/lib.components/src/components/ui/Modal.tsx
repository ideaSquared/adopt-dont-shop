import clsx from 'clsx';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';
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
  /**
   * Whether pressing Escape closes the modal. Defaults to `true`.
   *
   * Only set to `false` for blocking modals that require explicit user
   * action (e.g. LegalReacceptanceModal). Passing `!isSubmitting` is
   * fine to prevent close during async operations.
   */
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

// Open modals, so stacked dialogs behave as a stack: Escape closes only the
// top-most one, and the page stays scroll-locked until the last one closes.
//
// "Top-most" cannot be read from registration order alone: effects run
// child-first, so a modal nested inside another registers before its parent
// when both mount in the same commit. Each entry therefore also records the
// modals it is rendered inside (via context, which flows through portals). A
// modal that contains another open modal is never the top one; among the rest,
// the one opened last wins.
type OpenModal = {
  id: string;
  ancestorIds: readonly string[];
  order: number;
};

let openModals: readonly OpenModal[] = [];
let lastOpenOrder = 0;

const registerOpenModal = (id: string, ancestorIds: readonly string[]) => {
  lastOpenOrder += 1;
  openModals = [
    ...openModals.filter(modal => modal.id !== id),
    { id, ancestorIds, order: lastOpenOrder },
  ];
};

const unregisterOpenModal = (id: string) => {
  openModals = openModals.filter(modal => modal.id !== id);
};

const isTopModal = (id: string) => {
  const withoutOpenDescendant = openModals.filter(
    modal => !openModals.some(other => other.ancestorIds.includes(modal.id))
  );
  const top = withoutOpenDescendant.reduce<OpenModal | undefined>(
    (best, modal) => (!best || modal.order > best.order ? modal : best),
    undefined
  );
  return top?.id === id;
};

const ModalAncestryContext = createContext<readonly string[]>([]);

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
  const titleId = useId();
  const ancestorIds = useContext(ModalAncestryContext);
  const ownAncestry = useMemo(() => [...ancestorIds, titleId], [ancestorIds, titleId]);
  const modalRef = useRef<HTMLDivElement>(null);
  const isInitialOpen = useRef(false);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape' && isTopModal(titleId)) {
        onClose();
      }
    },
    [closeOnEscape, onClose, titleId]
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    registerOpenModal(titleId, ancestorIds);
    document.body.style.overflow = 'hidden';
    return () => {
      unregisterOpenModal(titleId);
      if (openModals.length === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, titleId, ancestorIds]);

  useEffect(() => {
    if (isOpen) {
      if (!isInitialOpen.current) {
        isInitialOpen.current = true;
        const activeElement = document.activeElement;
        previouslyFocused.current = activeElement instanceof HTMLElement ? activeElement : null;
        setTimeout(() => {
          if (modalRef.current) {
            const focusable = modalRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]:not([disabled]), [role="menuitem"]:not([disabled])'
            );
            if (focusable.length > 0) {
              focusable[0].focus();
            }
          }
        }, 0);
      }

      if (closeOnEscape) {
        document.addEventListener('keydown', handleEscape);
      }

      return () => {
        if (closeOnEscape) {
          document.removeEventListener('keydown', handleEscape);
        }
      };
    } else {
      if (isInitialOpen.current) {
        const toFocus = previouslyFocused.current;
        if (toFocus && document.body.contains(toFocus)) {
          toFocus.focus();
        }
        previouslyFocused.current = null;
      }
      isInitialOpen.current = false;
    }
  }, [isOpen, closeOnEscape, handleEscape]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && closeOnEscape) {
      // React events bubble through portals, so a nested modal's Escape also
      // reaches this handler; only the top-most modal reacts.
      if (isTopModal(titleId)) {
        onClose();
      }
      return;
    }
    if (event.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]:not([disabled]), [role="menuitem"]:not([disabled])'
      );
      if (focusable.length === 0) {
        return;
      }
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

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    // Overlay captures click-outside-to-close. The Tab focus trap and
    // Escape handling are both managed via the inner dialog's onKeyDown
    // below (with a document-level Escape listener as backup) — no
    // keyboard handler is needed on the overlay itself.
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className={clsx(styles.modalContainer({ size, centered }), className)}
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? titleId : undefined}
        data-testid={dataTestId}
        onKeyDown={handleKeyDown}
      >
        {(title || header) && (
          <div className={styles.modalHeader}>
            {header ?? (
              <h2 id={titleId} className={styles.modalTitle}>
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

  // Header, body and footer can all host a nested modal, so the whole dialog
  // sits inside the ancestry provider.
  return createPortal(
    <ModalAncestryContext.Provider value={ownAncestry}>
      {modalContent}
    </ModalAncestryContext.Provider>,
    document.body
  );
};

Modal.displayName = 'Modal';
