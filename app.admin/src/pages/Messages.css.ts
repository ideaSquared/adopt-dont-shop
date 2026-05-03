import { globalStyle, style } from '@vanilla-extract/css';

export const messagePreview = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
  maxWidth: '400px',
});

export const messageParticipants = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: '#111827',
  fontWeight: '600',
});

globalStyle(`${messageParticipants} svg`, {
  fontSize: '0.875rem',
  color: '#9ca3af',
});

export const messageSubject = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const messageMeta = style({
  display: 'flex',
  gap: '0.75rem',
  fontSize: '0.75rem',
  color: '#9ca3af',
});

export const participantInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const participantName = style({
  fontSize: '0.875rem',
  color: '#111827',
  fontWeight: '500',
});

export const participantRole = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const actionButtons = style({
  display: 'flex',
  gap: '0.5rem',
});

export const actionButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  background: '#ffffff',
  color: '#6b7280',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f9fafb',
    color: '#111827',
    borderColor: '#d1d5db',
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});

export const statusDotActive = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#10b981',
  flexShrink: 0,
});

export const statusDotFlagged = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#f59e0b',
  flexShrink: 0,
});

export const statusDotArchived = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#9ca3af',
  flexShrink: 0,
});

export const statusDotDefault = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#6b7280',
  flexShrink: 0,
});
