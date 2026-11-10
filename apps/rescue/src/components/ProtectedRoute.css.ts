import { vars } from '@adopt-dont-shop/lib.components/theme';
import { style } from '@vanilla-extract/css';

export const loadingContainer = style({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: vars.background.muted,
});

export const loadingCard = style({
  padding: vars.spacing['8'],
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.spacing['4'],
});
