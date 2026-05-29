import { style } from '@vanilla-extract/css';

export const detailSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  maxHeight: '70vh',
  overflowY: 'auto',
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
  ':focus-visible': {
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

export const detailValueSecondary = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const detailValueMeta = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  marginTop: '0.25rem',
});

export const internalNotesSection = style({
  background: '#fef3c7',
  borderColor: '#fbbf24',
});

export const internalNotesLabel = style({
  color: '#92400e',
});

export const internalBadgeSpacing = style({
  marginLeft: '0.5rem',
});

export const userLink = style({
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 'inherit',
  ':hover': {
    textDecoration: 'underline',
  },
});

// ── Activity tab ──────────────────────────────────────────────────

export const activityList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const activityItem = style({
  display: 'flex',
  gap: '0.75rem',
  padding: '0.625rem 0',
  borderBottom: '1px solid #e5e7eb',
  ':last-child': {
    borderBottom: 'none',
  },
});

export const activityDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#2563eb',
  marginTop: '0.375rem',
  flexShrink: 0,
});

export const activityContent = style({
  flex: 1,
  minWidth: 0,
});

export const activityDescription = style({
  fontSize: '0.8125rem',
  color: '#111827',
  margin: 0,
});

export const activityMeta = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  margin: '0.125rem 0 0 0',
});

export const activityEmpty = style({
  padding: '2rem 1rem',
  textAlign: 'center',
  color: '#6b7280',
  fontSize: '0.875rem',
});

// ── EntityInspector embed ─────────────────────────────────────────

export const inspectorEmbed = style({
  // The inspector renders its own card; strip the outer surface
  // shadow/border when nested inside the modal body so we don't
  // double-up borders.
  background: 'transparent',
  boxShadow: 'none',
  border: 'none',
});

export const inspectorHeader = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  minWidth: 0,
});
