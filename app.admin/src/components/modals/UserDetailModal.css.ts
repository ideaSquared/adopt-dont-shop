import { style } from '@vanilla-extract/css';

export const detailSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const userHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
});

export const userAvatar = style({
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontWeight: '600',
  fontSize: '1.5rem',
});

export const userInfo = style({
  flex: 1,
});

export const userName = style({
  margin: '0 0 0.25rem 0',
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
});

export const userEmail = style({
  margin: 0,
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const badgeSuccess = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#d1fae5',
  color: '#065f46',
});

export const badgeWarning = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fef3c7',
  color: '#92400e',
});

export const badgeDanger = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fee2e2',
  color: '#991b1b',
});

export const badgeInfo = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#dbeafe',
  color: '#1e40af',
});

export const badgeNeutral = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#f3f4f6',
  color: '#374151',
});

export const detailGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1.5rem',
  '@media': {
    'screen and (max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const detailItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const detailLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
});

export const detailValue = style({
  fontSize: '0.875rem',
  color: '#111827',
  fontWeight: '500',
});

export const emptyValue = style({
  color: '#9ca3af',
  fontStyle: 'italic',
});
