import { style } from '@vanilla-extract/css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const recipientInfo = style({
  padding: '1rem',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const recipientLabel = style({
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
});

export const recipientName = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
});

export const recipientEmail = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem',
  '@media': {
    'screen and (max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const infoBox = style({
  padding: '0.75rem 1rem',
  background: '#dbeafe',
  border: '1px solid #93c5fd',
  borderRadius: '8px',
  color: '#1e40af',
  fontSize: '0.875rem',
});
