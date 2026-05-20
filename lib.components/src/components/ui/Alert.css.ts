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
    animation: `${slideIn} ${vars.transitions.base}`,
    '@media': {
      '(prefers-reduced-motion: reduce)': { animation: 'none' },
    },
  },
  variants: {
    variant: {
      success: {
        background: vars.colors.successBgSubtle,
        borderColor: vars.colors.successBorderSubtle,
        color: vars.colors.successTextEmphasis,
      },
      error: {
        background: vars.colors.dangerBgSubtle,
        borderColor: vars.colors.dangerBorderSubtle,
        color: vars.colors.dangerTextEmphasis,
      },
      warning: {
        background: vars.colors.warningBgSubtle,
        borderColor: vars.colors.warningBorderSubtle,
        color: vars.colors.warningTextEmphasis,
      },
      info: {
        background: vars.colors.infoBgSubtle,
        borderColor: vars.colors.infoBorderSubtle,
        color: vars.colors.infoTextEmphasis,
      },
    },
    size: {
      sm: { padding: vars.spacing['2'], gap: vars.spacing['2'], fontSize: vars.typography.size.sm },
      md: {
        padding: vars.spacing['3'],
        gap: vars.spacing['2'],
        fontSize: vars.typography.size.base,
      },
      lg: { padding: vars.spacing['3'], gap: vars.spacing['3'], fontSize: vars.typography.size.lg },
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
  success: { color: vars.colors.successHover },
  error: { color: vars.colors.dangerHover },
  warning: { color: vars.colors.warningHover },
  info: { color: vars.colors.infoHover },
});

export const alertContent = style({ flex: '1', minWidth: 0 });

export const alertTitleBase = style({
  fontWeight: vars.typography.weight.semibold,
  lineHeight: vars.typography.lineHeight.tight,
});

export const alertTitleSize = styleVariants({
  sm: { fontSize: vars.typography.size.sm, marginBottom: vars.spacing['1'] },
  md: { fontSize: vars.typography.size.base, marginBottom: vars.spacing['1'] },
  lg: { fontSize: vars.typography.size.lg, marginBottom: vars.spacing['2'] },
});

export const alertTitleColor = styleVariants({
  success: { color: vars.colors.successTextEmphasis },
  error: { color: vars.colors.dangerTextEmphasis },
  warning: { color: vars.colors.warningTextEmphasis },
  info: { color: vars.colors.infoTextEmphasis },
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
  md: { width: '24px', height: '24px', top: vars.spacing['2'], right: vars.spacing['2'] },
  lg: { width: '28px', height: '28px', top: vars.spacing['3'], right: vars.spacing['3'] },
});
