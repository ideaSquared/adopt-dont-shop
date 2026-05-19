import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const row = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const ghostLink = style({
  color: '#fff',
  textDecoration: 'none',
  padding: `${vars.spacing['2']} ${vars.spacing['2']}`,
  borderRadius: vars.border.radius.base,
  fontWeight: 500,
  fontSize: vars.typography.size.sm,
  transition: `background ${vars.transitions.fast}`,
  ':hover': {
    background: 'rgba(255, 255, 255, 0.12)',
  },
  ':focus-visible': {
    outline: '2px solid rgba(255, 255, 255, 0.8)',
    outlineOffset: '2px',
  },
});

export const solidLink = style({
  color: vars.colors.primaryActive,
  background: '#fff',
  textDecoration: 'none',
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  borderRadius: vars.border.radius.base,
  fontWeight: 600,
  fontSize: vars.typography.size.sm,
  transition: `transform ${vars.transitions.fast}, box-shadow ${vars.transitions.fast}`,
  ':hover': {
    transform: 'translateY(-1px)',
    boxShadow: vars.shadows.base,
  },
  ':focus-visible': {
    outline: '2px solid rgba(255, 255, 255, 0.8)',
    outlineOffset: '2px',
  },
});
