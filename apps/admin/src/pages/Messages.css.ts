import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
});

export const messagePreview = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
  maxWidth: '400px',
});

export const messageParticipants = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.sm,
  color: vars.text.primary,
  fontWeight: vars.typography.weight.semibold,
});

globalStyle(`${messageParticipants} svg`, {
  fontSize: vars.typography.size.sm,
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
  fontSize: vars.typography.size.xs,
  color: vars.text.muted,
});

export const participantInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const participantName = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.primary,
  fontWeight: vars.typography.weight.medium,
});

export const participantRole = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
});

export const actionButtons = style({
  display: 'flex',
  gap: vars.spacing['2'],
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
  color: vars.text.tertiary,
  fontStyle: 'italic',
});

export const participantsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const participantMore = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
});
