import React, { useEffect } from 'react';

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

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
};

const panelStyle: React.CSSProperties = {
  background: 'var(--color-surface, #fff)',
  borderRadius: '12px',
  padding: '20px',
  width: 'min(720px, 92vw)',
  maxHeight: '85vh',
  overflowY: 'auto',
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
    <div style={overlayStyle} role='presentation'>
      <div style={panelStyle} role='dialog' aria-modal='true'>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button type='button' onClick={onClose} aria-label='Close'>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
