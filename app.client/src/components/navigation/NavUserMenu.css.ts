import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const triggerButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  background: 'transparent',
  border: 'none',
  padding: vars.spacing['1'],
  borderRadius: vars.border.radius.full,
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

export const content = style({
  minWidth: '240px',
  background: vars.background.primary,
  color: vars.text.primary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.md,
  boxShadow: vars.shadows.md,
  padding: `${vars.spacing['1']} 0`,
  zIndex: 1100,
});

export const header = style({
  padding: `${vars.spacing['3']} ${vars.spacing['4']} ${vars.spacing['2']}`,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['0.5'],
});

export const name = style({
  fontWeight: 600,
  color: vars.text.primary,
});

export const email = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
});

export const separator = style({
  height: '1px',
  background: vars.border.color.primary,
  margin: `${vars.spacing['1']} 0`,
});

export const item = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  color: vars.text.primary,
  textDecoration: 'none',
  cursor: 'pointer',
  outline: 'none',
  fontSize: vars.typography.size.sm,
  selectors: {
    '&[data-highlighted]': {
      background: vars.background.tertiary,
    },
    '&:focus-visible': {
      background: vars.background.tertiary,
    },
    '& svg': {
      width: '18px',
      height: '18px',
      flexShrink: 0,
    },
  },
});

export const dangerItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  textDecoration: 'none',
  cursor: 'pointer',
  outline: 'none',
  fontSize: vars.typography.size.sm,
  color: vars.colors.semantic.error['600'],
  selectors: {
    '&[data-highlighted]': {
      background: vars.colors.semantic.error['50'],
      color: vars.colors.semantic.error['700'],
    },
    '&:focus-visible': {
      background: vars.colors.semantic.error['50'],
      color: vars.colors.semantic.error['700'],
    },
    '& svg': {
      width: '18px',
      height: '18px',
      flexShrink: 0,
    },
  },
});
