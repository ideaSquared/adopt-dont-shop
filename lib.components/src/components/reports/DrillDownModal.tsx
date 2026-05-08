import React, { useEffect } from 'react';
import * as styles from './DrillDownModal.css';

/**
 * ADS-105: Detail view shown when a widget supports drill-down and
 * the user clicks it. The contents are caller-provided so each app
 * can wire its own data source.
 *
 * Close affordances: explicit close button + Escape key. The overlay
 * itself is decorative (role='presentation') and intentionally has no
 * click-to-close handler — jsx-a11y rules treat that as a non-keyboard-
 * accessible interaction. Escape on document handles the same UX
 * outcome with proper keyboard support.
 */

export type DrillDownModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export const DrillDownModal: React.FC<DrillDownModalProps> = ({ title, onClose, children }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={styles.overlay} role='presentation'>
      <div className={styles.panel} role='dialog' aria-modal='true'>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button type='button' onClick={onClose} aria-label='Close'>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
