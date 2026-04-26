import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, keyframes, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../styles/theme.css';

const slideIn = keyframes({
  from: { opacity: '0', transform: 'translateY(-8px)' },
  to: { opacity: '1', transform: 'translateY(0)' },
});

export const alertContainer = recipe({
  base: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    border: '1px solid',
    borderRadius: vars.border.radius.lg,
    fontFamily: vars.typography.family.sans,
    lineHeight: vars.typography.lineHeight.relaxed,
    animation: `${slideIn} ${vars.transitions.normal}`,
    '@media': {
      '(prefers-reduced-motion: reduce)': { animation: 'none' },
    },
  },
  variants: {
    variant: {
      success: {
        background: vars.colors.semantic.success['50'],
        borderColor: vars.colors.semantic.success['200'],
        color: vars.colors.semantic.success['800'],
      },
      error: {
        background: vars.colors.semantic.error['50'],
        borderColor: vars.colors.semantic.error['200'],
        color: vars.colors.semantic.error['800'],
      },
      warning: {
        background: vars.colors.semantic.warning['50'],
        borderColor: vars.colors.semantic.warning['200'],
        color: vars.colors.semantic.warning['800'],
      },
      info: {
        background: vars.colors.semantic.info['50'],
        borderColor: vars.colors.semantic.info['200'],
        color: vars.colors.semantic.info['800'],
      },
    },
    size: {
      sm: { padding: vars.spacing['3'], gap: vars.spacing['2'], fontSize: vars.typography.size.sm },
      md: { padding: vars.spacing['4'], gap: vars.spacing['3'], fontSize: vars.typography.size.base },
      lg: { padding: vars.spacing['5'], gap: vars.spacing['4'], fontSize: vars.typography.size.lg },
    },
  },
  defaultVariants: { variant: 'info', size: 'md' },
});

export const alertIconWrapper = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginTop: '2px',
});

export const alertIconSize = styleVariants({
  sm: {},
  md: {},
  lg: {},
});
globalStyle(`${alertIconSize.sm} svg`, { width: '16px', height: '16px' });
globalStyle(`${alertIconSize.md} svg`, { width: '20px', height: '20px' });
globalStyle(`${alertIconSize.lg} svg`, { width: '24px', height: '24px' });

export const alertIconColor = styleVariants({
  success: { color: vars.colors.semantic.success['600'] },
  error: { color: vars.colors.semantic.error['600'] },
  warning: { color: vars.colors.semantic.warning['600'] },
  info: { color: vars.colors.semantic.info['600'] },
});

export const alertContent = style({ flex: '1', minWidth: 0 });

export const alertTitleBase = style({
  fontWeight: vars.typography.weight.semibold,
  lineHeight: vars.typography.lineHeight.tight,
});

export const alertTitleSize = styleVariants({
  sm: { fontSize: vars.typography.size.sm, marginBottom: vars.spacing['1'] },
  md: { fontSize: vars.typography.size.base, marginBottom: vars.spacing['1.5'] },
  lg: { fontSize: vars.typography.size.lg, marginBottom: vars.spacing['2'] },
});

export const alertTitleColor = styleVariants({
  success: { color: vars.colors.semantic.success['900'] },
  error: { color: vars.colors.semantic.error['900'] },
  warning: { color: vars.colors.semantic.warning['900'] },
  info: { color: vars.colors.semantic.info['900'] },
});

export const alertMessage = style({ lineHeight: vars.typography.lineHeight.relaxed });

export const alertCloseButtonBase = style({
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  borderRadius: vars.border.radius.sm,
  cursor: 'pointer',
  color: 'currentColor',
  opacity: 0.6,
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover': { opacity: 1, background: 'rgb(0 0 0 / 0.1)' },
    '&:focus-visible': { outline: 'none', opacity: 1, boxShadow: vars.shadows.focus },
    '&:active': { transform: 'scale(0.95)' },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: { '&:active': { transform: 'none' } },
    },
  },
});

export const alertCloseButtonSize = styleVariants({
  sm: { width: '20px', height: '20px', top: vars.spacing['2'], right: vars.spacing['2'] },
  md: { width: '24px', height: '24px', top: vars.spacing['3'], right: vars.spacing['3'] },
  lg: { width: '28px', height: '28px', top: vars.spacing['4'], right: vars.spacing['4'] },
});
