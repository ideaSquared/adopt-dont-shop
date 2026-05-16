import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const lockup = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  textDecoration: 'none',
  lineHeight: 1,
});

export const wordmark = style({
  fontFamily: `'Fredoka', ${vars.typography.family.sans}`,
  fontSize: '1.375rem',
  lineHeight: 1,
  letterSpacing: '-0.005em',
  color: vars.text.primary,
  userSelect: 'none',
});

export const wordmarkDark = style({
  color: '#FFFFFF',
});
