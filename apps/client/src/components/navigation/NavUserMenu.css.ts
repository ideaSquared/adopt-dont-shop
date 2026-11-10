import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const triggerButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  background: 'transparent',
  border: 'none',
  padding: vars.spacing['1'],
  borderRadius: vars.border.radius.pill,
  cursor: 'pointer',
  color: 'inherit',
  transition: `background ${vars.transitions.fast}`,
  ':hover': {
    background: 'rgba(255, 255, 255, 0.12)',
  },
  ':focus-visible': {
    outline: '2px solid rgba(255, 255, 255, 0.8)',
    outlineOffset: '2px',
  },
});

export const identity = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const name = style({
  fontWeight: 600,
  color: vars.text.primary,
});

export const email = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
});
