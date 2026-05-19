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
  color: vars.text.quaternary,
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
  color: vars.text.quaternary,
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
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '6px',
  background: vars.background.secondary,
  color: vars.text.tertiary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.background.primary,
    color: vars.text.primary,
    borderColor: vars.border.color.secondary,
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});

export const statusDotActive = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.colors.semantic.success['500'],
  flexShrink: 0,
});

export const statusDotFlagged = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.colors.semantic.warning['500'],
  flexShrink: 0,
});

export const statusDotArchived = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.text.quaternary,
  flexShrink: 0,
});

export const statusDotDefault = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.text.tertiary,
  flexShrink: 0,
});
