import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

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
  color: vars.text.primary,
  fontWeight: '600',
});

globalStyle(`${messageParticipants} svg`, {
  fontSize: '0.875rem',
  color: vars.text.muted,
});

export const messageSubject = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const messageMeta = style({
  display: 'flex',
  gap: '0.75rem',
  fontSize: '0.75rem',
  color: vars.text.muted,
});

export const participantInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const participantName = style({
  fontSize: '0.875rem',
  color: vars.text.primary,
  fontWeight: '500',
});

export const participantRole = style({
  fontSize: '0.75rem',
  color: vars.text.tertiary,
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
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '6px',
  background: vars.background.surface,
  color: vars.text.tertiary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.background.body,
    color: vars.text.primary,
    borderColor: vars.border.color.muted,
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});

export const statusDotActive = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.colors.success,
  flexShrink: 0,
});

export const statusDotFlagged = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.colors.warning,
  flexShrink: 0,
});

export const statusDotArchived = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.text.muted,
  flexShrink: 0,
});

export const statusDotDefault = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.text.tertiary,
  flexShrink: 0,
});

export const lastMessageCell = style({
  maxWidth: '250px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const noMessagesPlaceholder = style({
  color: '#9ca3af',
  fontStyle: 'italic',
});

export const participantsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const participantMore = style({
  fontSize: '0.75rem',
  color: '#9ca3af',
});

export const errorBanner = style({
  padding: '2rem',
  textAlign: 'center',
  color: '#ef4444',
});
