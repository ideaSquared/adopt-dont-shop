import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const banner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '1rem 1.25rem',
  marginBottom: '1.5rem',
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '0.5rem',
  '@media': {
    'screen and (max-width: 640px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});

export const message = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const title = style({
  fontSize: '0.9375rem',
  fontWeight: 600,
  color: vars.text.primary,
});

export const timestamp = style({
  fontSize: '0.8125rem',
  color: vars.text.secondary,
});

export const actions = style({
  display: 'flex',
  gap: '0.5rem',
});
