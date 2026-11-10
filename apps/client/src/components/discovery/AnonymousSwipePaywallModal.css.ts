import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const body = style({
  textAlign: 'center',
});

export const subtitle = style({
  fontSize: vars.typography.size.base,
  color: '#6c757d',
  margin: `0 0 ${vars.spacing['4']} 0`,
});

export const actions = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});
