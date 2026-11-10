import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const loadingContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: vars.background.muted,
});

export const loadingText = style({
  marginTop: vars.spacing['3'],
  color: vars.text.tertiary,
  fontSize: vars.typography.size.sm,
});

export const unauthorizedContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: vars.background.muted,
  padding: vars.spacing['5'],
  textAlign: 'center',
});

export const unauthorizedCard = style({
  maxWidth: '500px',
});

export const unauthorizedIcon = style({
  fontSize: '4rem',
  marginBottom: vars.spacing['4'],
  color: vars.text.tertiary,
});

export const unauthorizedMessage = style({
  display: 'block',
  margin: `0 0 ${vars.spacing['5']} 0`,
  lineHeight: '1.6',
});
