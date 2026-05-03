import { style } from '@vanilla-extract/css';

export const detailSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  maxHeight: '70vh',
  overflowY: 'auto',
});

export const ticketHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
});

export const ticketTitle = style({
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
});

export const ticketId = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  fontFamily: '"Courier New", monospace',
});

export const badgeRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  alignItems: 'center',
});

export const badge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
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

export const descriptionSection = style({
  padding: '1rem',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
});

export const descriptionLabel = style({
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
  marginBottom: '0.75rem',
});

export const descriptionText = style({
  fontSize: '0.875rem',
  color: '#111827',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
});

export const responsesSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const responsesHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
});

export const responseCard = style({
  padding: '1rem',
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const responseCardInternal = style({
  background: '#fef3c7',
  borderColor: '#fbbf24',
});

export const responseHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const responseMeta = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const responderInfo = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
});

export const responseTime = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const responseContent = style({
  fontSize: '0.875rem',
  color: '#374151',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
});

export const replyForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
});

export const textArea = style({
  padding: '0.75rem 1rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: '100px',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: '#9ca3af',
  },
  ':focus': {
    outline: 'none',
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
  '::placeholder': {
    color: '#9ca3af',
  },
});

export const checkboxLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: '#374151',
  cursor: 'pointer',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
});

export const emptyState = style({
  padding: '2rem',
  textAlign: 'center',
  color: '#9ca3af',
  fontStyle: 'italic',
});

export const internalBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.625rem',
  fontWeight: '600',
  background: '#92400e',
  color: '#ffffff',
});
