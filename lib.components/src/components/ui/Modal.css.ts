import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, keyframes, style } from '@vanilla-extract/css';

import { darkThemeClass, vars } from '../../styles/theme.css';

const fadeIn = keyframes({
  from: { opacity: '0' },
  to: { opacity: '1' },
});

const scaleInCentered = keyframes({
  from: { opacity: '0', transform: 'scale(0.95) translate(-50%, -50%)' },
  to: { opacity: '1', transform: 'scale(1) translate(-50%, -50%)' },
});

const scaleInTop = keyframes({
  from: { opacity: '0', transform: 'scale(0.95) translate(-50%, 0)' },
  to: { opacity: '1', transform: 'scale(1) translate(-50%, 0)' },
});

export const overlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: vars.background.overlay,
  backdropFilter: 'blur(4px)',
  zIndex: vars.zIndex.modal,
  animation: `${fadeIn} ${vars.transitions.normal}`,
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none', backdropFilter: 'none' },
  },
});

export const modalContainer = recipe({
  base: {
    position: 'fixed',
    left: '50%',
    background: vars.background.secondary,
    borderRadius: vars.border.radius.xl,
    boxShadow: vars.shadows['2xl'],
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    selectors: {
      [`:is(html.${darkThemeClass}) &`]: {
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.6), 0 0 0 1px rgb(255 255 255 / 0.05)',
      },
    },
    '@media': {
      '(prefers-reduced-motion: reduce)': { animation: 'none' },
    },
  },
  variants: {
    size: {
      sm: { width: '90%', maxWidth: '384px', maxHeight: '90vh' },
      md: { width: '90%', maxWidth: '512px', maxHeight: '90vh' },
      lg: { width: '90%', maxWidth: '768px', maxHeight: '90vh' },
      xl: { width: '90%', maxWidth: '1024px', maxHeight: '90vh' },
      full: { width: '95%', height: '95%', maxWidth: 'none', maxHeight: 'none' },
    },
    centered: {
      true: {
        top: '50%',
        transform: 'translate(-50%, -50%)',
        animation: `${scaleInCentered} ${vars.transitions.normal}`,
        '@media': {
          '(prefers-reduced-motion: reduce)': {
            animation: 'none',
            transform: 'translate(-50%, -50%)',
          },
        },
      },
      false: {
        top: '10%',
        transform: 'translate(-50%, 0)',
        animation: `${scaleInTop} ${vars.transitions.normal}`,
        '@media': {
          '(prefers-reduced-motion: reduce)': {
            animation: 'none',
            transform: 'translate(-50%, 0)',
          },
        },
      },
    },
  },
  defaultVariants: { size: 'md', centered: true },
});

export const modalHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: vars.spacing['6'],
  paddingLeft: vars.spacing['6'],
  paddingRight: vars.spacing['6'],
  paddingBottom: vars.spacing['4'],
  borderBottom: `1px solid ${vars.border.color.primary}`,
  flexShrink: 0,
});

export const modalTitle = style({
  margin: 0,
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  lineHeight: vars.typography.lineHeight.tight,
});

export const modalContent = style({
  padding: vars.spacing['6'],
  flex: '1',
  overflowY: 'auto',
  color: vars.text.secondary,
  lineHeight: vars.typography.lineHeight.relaxed,
  selectors: {
    '&::-webkit-scrollbar': { width: '6px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': { background: vars.border.color.tertiary, borderRadius: '3px' },
    '&::-webkit-scrollbar-thumb:hover': { background: vars.border.color.quaternary },
  },
});

export const modalFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: vars.spacing['3'],
  paddingTop: vars.spacing['4'],
  paddingLeft: vars.spacing['6'],
  paddingRight: vars.spacing['6'],
  paddingBottom: vars.spacing['6'],
  borderTop: `1px solid ${vars.border.color.primary}`,
  flexShrink: 0,
});

export const closeButton = style({
  display: 'flex',
  position: 'absolute',
  top: vars.spacing['4'],
  right: vars.spacing['4'],
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: vars.border.radius.md,
  border: 'none',
  background: 'transparent',
  color: vars.text.tertiary,
  zIndex: '10',
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover': { background: vars.background.tertiary, color: vars.text.primary },
    '&:focus-visible': { outline: 'none', boxShadow: vars.shadows.focus },
    '&:active': { transform: 'scale(0.95)' },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: { '&:active': { transform: 'none' } },
    },
  },
});
globalStyle(`${closeButton} svg`, { width: '20px', height: '20px' });
