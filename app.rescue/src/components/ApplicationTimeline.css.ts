import { style } from '@vanilla-extract/css';

export const timelineContainer = style({
  position: 'relative',
  padding: '0 1rem',
});

export const timelineLine = style({
  position: 'absolute',
  left: '2rem',
  top: 0,
  bottom: 0,
  width: '2px',
  background: '#e5e7eb',
  zIndex: 0,
});

export const timelineItem = style({
  position: 'relative',
  display: 'flex',
  gap: '1rem',
  padding: '1rem 0',
  zIndex: 1,
  selectors: {
    '&:not(:last-child)': {
      borderBottom: '1px solid #f3f4f6',
    },
  },
});

export const eventIcon = style({
  flexShrink: 0,
  width: '2.5rem',
  height: '2.5rem',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1rem',
  fontWeight: '600',
  color: 'white',
  border: '3px solid white',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  zIndex: 2,
});

export const eventContent = style({
  flex: 1,
  paddingTop: '0.25rem',
});

export const eventHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '0.25rem',
});

export const eventTitle = style({
  margin: 0,
  fontSize: '0.9rem',
  fontWeight: '600',
  color: '#111827',
  flex: 1,
});

export const eventTimestamp = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  flexShrink: 0,
});

export const eventDescription = style({
  margin: '0.25rem 0 0 0',
  fontSize: '0.8rem',
  color: '#4b5563',
  lineHeight: '1.4',
});

export const eventMetadata = style({
  marginTop: '0.5rem',
  padding: '0.75rem',
  background: '#f9fafb',
  borderRadius: '0.375rem',
  border: '1px solid #e5e7eb',
});

export const metadataItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.75rem',
  color: '#6b7280',
  selectors: {
    '&:not(:last-child)': {
      marginBottom: '0.25rem',
    },
  },
});

export const systemBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.125rem 0.375rem',
  background: '#f3f4f6',
  color: '#6b7280',
  borderRadius: '0.25rem',
  fontSize: '0.625rem',
  fontWeight: '500',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

export const addNoteSection = style({
  marginTop: '1.5rem',
  padding: '1rem',
  background: '#f8fafc',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
});

export const noteForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const noteInput = style({
  width: '100%',
  minHeight: '80px',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  resize: 'vertical',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const noteTypeSelect = style({
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const submitButton = style({
  alignSelf: 'flex-start',
  padding: '0.5rem 1rem',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  ':hover': {
    background: '#2563eb',
  },
  ':disabled': {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
});

export const metadataKey = style({
  fontWeight: 500,
});

export const addNoteHeading = style({
  margin: '0 0 0.75rem 0',
  fontSize: '0.9rem',
  fontWeight: 600,
});
