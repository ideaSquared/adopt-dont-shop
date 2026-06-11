import { style } from '@vanilla-extract/css';

export const overlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: '1rem',
});

export const modal = style({
  background: '#ffffff',
  borderRadius: '12px',
  maxWidth: '560px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
});

export const header = style({
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const title = style({
  fontSize: '1.125rem',
  fontWeight: 700,
  color: '#111827',
  margin: 0,
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  padding: '0.25rem',
  display: 'flex',
  alignItems: 'center',
});

export const body = style({
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const description = style({
  fontSize: '0.875rem',
  color: '#374151',
  lineHeight: 1.5,
  margin: 0,
});

export const countBadge = style({
  display: 'inline-block',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  background: '#dbeafe',
  color: '#1e40af',
  fontSize: '0.75rem',
  fontWeight: 600,
  width: 'fit-content',
});

export const severityWarning = style({
  background: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#92400e',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const severityCritical = style({
  background: '#fee2e2',
  border: '1px solid #dc2626',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#991b1b',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
});

export const label = style({
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#374151',
});

export const required = style({
  color: '#dc2626',
  marginLeft: '0.25rem',
});

export const select = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
});

export const textArea = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  minHeight: '80px',
  resize: 'vertical',
  fontFamily: 'inherit',
});

export const input = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  fontFamily: 'inherit',
});

export const footer = style({
  padding: '1rem 1.5rem',
  borderTop: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
});

export const buttonSecondary = style({
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#374151',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
});

export const buttonPrimary = style({
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  border: 'none',
  background: '#3b82f6',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  ':disabled': {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
});

export const buttonDanger = style({
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  border: 'none',
  background: '#dc2626',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  ':disabled': {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
});

export const helpText = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const resultBanner = style({
  background: '#dcfce7',
  border: '1px solid #16a34a',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#166534',
});

export const resultBannerFailed = style({
  background: '#fee2e2',
  border: '1px solid #dc2626',
  color: '#991b1b',
});
