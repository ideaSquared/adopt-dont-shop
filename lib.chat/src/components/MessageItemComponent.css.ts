import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

const messageItemBase = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
});

export const messageItemOwn = styleVariants({
  first: [messageItemBase, { alignItems: 'flex-end', marginTop: '0.5rem' }],
  single: [messageItemBase, { alignItems: 'flex-end', marginTop: '0.5rem' }],
  middle: [messageItemBase, { alignItems: 'flex-end', marginTop: '0.0625rem' }],
  last: [messageItemBase, { alignItems: 'flex-end', marginTop: '0.0625rem' }],
});

export const messageItemOther = styleVariants({
  first: [messageItemBase, { alignItems: 'flex-start', marginTop: '0.5rem' }],
  single: [messageItemBase, { alignItems: 'flex-start', marginTop: '0.5rem' }],
  middle: [messageItemBase, { alignItems: 'flex-start', marginTop: '0.0625rem' }],
  last: [messageItemBase, { alignItems: 'flex-start', marginTop: '0.0625rem' }],
});

export const messageRowOwn = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'flex-end',
  gap: '0.5rem',
  width: '100%',
});

export const messageRowOther = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'flex-start',
  gap: '0.5rem',
  width: '100%',
});

export const avatarSpacer = style({
  width: '40px',
  flex: '0 0 auto',
});

export const senderName = style({
  fontSize: '0.75rem',
  fontWeight: '600',
  color: vars.text.tertiary,
  margin: '0 0 0.25rem 3rem',
  letterSpacing: '0.01em',
});

export const senderRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  margin: '0 0 0.25rem 3rem',
});

export const senderRowOwn = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  margin: '0 0.5rem 0.25rem 0',
  justifyContent: 'flex-end',
});

export const senderRowName = style({
  fontSize: '0.75rem',
  fontWeight: '600',
  color: vars.text.tertiary,
  letterSpacing: '0.01em',
});

export const staffBadge = style({
  fontSize: '0.625rem',
  fontWeight: '700',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: vars.colors.primary['50'],
  backgroundColor: vars.colors.primary['600'],
  borderRadius: '0.25rem',
  padding: '0.0625rem 0.375rem',
  lineHeight: '1.2',
});
