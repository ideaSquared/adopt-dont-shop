import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components';

export const messageListWrapper = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  width: '100%',
  flex: '1 1 auto',
  overflowY: 'auto',
  padding: '1rem 0.75rem 0.5rem 0.75rem',
  background: vars.background.primary,
  scrollbarWidth: 'thin',
  scrollbarColor: `${vars.colors.neutral['300']} ${vars.background.primary}`,
});

globalStyle(`${messageListWrapper}::-webkit-scrollbar`, {
  width: '6px',
  background: vars.background.primary,
});

globalStyle(`${messageListWrapper}::-webkit-scrollbar-thumb`, {
  background: vars.colors.neutral['300'],
  borderRadius: '6px',
  transition: 'background 0.15s ease',
});

globalStyle(`${messageListWrapper}::-webkit-scrollbar-thumb:hover`, {
  background: vars.colors.neutral['400'],
});

export const emptyMessages = style({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.75rem',
  textAlign: 'center',
  color: vars.text.secondary,
  padding: '3rem 1rem',
});

globalStyle(`${emptyMessages} h4`, {
  margin: '0',
  color: vars.text.primary,
  fontSize: '1.1rem',
  fontWeight: '700',
  letterSpacing: '-0.01em',
});

globalStyle(`${emptyMessages} p`, {
  margin: '0',
  fontSize: '0.9rem',
});

export const daySeparator = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '1rem 0 0.5rem 0',
  color: vars.text.tertiary,
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  selectors: {
    '&::before': {
      content: '""',
      flex: '1',
      height: '1px',
      background: vars.border.color.tertiary,
    },
    '&::after': {
      content: '""',
      flex: '1',
      height: '1px',
      background: vars.border.color.tertiary,
    },
  },
});
