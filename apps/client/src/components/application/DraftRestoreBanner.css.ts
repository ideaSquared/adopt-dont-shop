import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const banner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing['3'],
  padding: '1rem 1.25rem',
  marginBottom: vars.spacing['4'],
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
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
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const timestamp = style({
  fontSize: '0.8125rem',
  color: vars.text.secondary,
});

export const actions = style({
  display: 'flex',
  gap: vars.spacing['2'],
});
