import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, keyframes, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

const slideInLeft = keyframes({
  from: { transform: 'translateX(-100%)', opacity: '0' },
  to: { transform: 'translateX(0)', opacity: '1' },
});

const slideInRight = keyframes({
  from: { transform: 'translateX(100%)', opacity: '0' },
  to: { transform: 'translateX(0)', opacity: '1' },
});

const slideInTop = keyframes({
  from: { transform: 'translateY(-100%)', opacity: '0' },
  to: { transform: 'translateY(0)', opacity: '1' },
});

const slideInBottom = keyframes({
  from: { transform: 'translateY(100%)', opacity: '0' },
  to: { transform: 'translateY(0)', opacity: '1' },
});

const slideOutLeft = keyframes({
  from: { transform: 'translateX(0)', opacity: '1' },
  to: { transform: 'translateX(-100%)', opacity: '0' },
});

const slideOutRight = keyframes({
  from: { transform: 'translateX(0)', opacity: '1' },
  to: { transform: 'translateX(100%)', opacity: '0' },
});

const slideOutTop = keyframes({
  from: { transform: 'translateY(0)', opacity: '1' },
  to: { transform: 'translateY(-100%)', opacity: '0' },
});

const slideOutBottom = keyframes({
  from: { transform: 'translateY(0)', opacity: '1' },
  to: { transform: 'translateY(100%)', opacity: '0' },
});

export const toastWrapper = recipe({
  base: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: vars.spacing['2'],
    padding: vars.spacing['3'],
    border: '1px solid',
    borderRadius: vars.border.radius.base,
    boxShadow: vars.shadows.lg,
    backdropFilter: 'blur(8px)',
    minWidth: '300px',
    maxWidth: '500px',
    marginBottom: vars.spacing['2'],
    position: 'relative',
  },
  variants: {
    type: {
      success: {
        backgroundColor: `color-mix(in srgb, ${vars.colors.successBgSubtle} 20%, transparent)`,
        borderColor: vars.colors.success,
        color: vars.colors.successTextEmphasis,
      },
      error: {
        backgroundColor: `color-mix(in srgb, ${vars.colors.dangerBgSubtle} 20%, transparent)`,
        borderColor: vars.colors.danger,
        color: vars.colors.dangerTextEmphasis,
      },
      warning: {
        backgroundColor: `color-mix(in srgb, ${vars.colors.warningBgSubtle} 20%, transparent)`,
        borderColor: vars.colors.warning,
        color: vars.colors.warningTextEmphasis,
      },
      info: {
        backgroundColor: `color-mix(in srgb, ${vars.colors.infoBgSubtle} 20%, transparent)`,
        borderColor: vars.colors.info,
        color: vars.colors.infoTextEmphasis,
      },
    },
    position: {
      'top-left': {
        animation: `${slideInLeft} 300ms ease-out`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
      'top-center': {
        animation: `${slideInTop} 300ms ease-out`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
      'top-right': {
        animation: `${slideInRight} 300ms ease-out`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
      'bottom-left': {
        animation: `${slideInLeft} 300ms ease-out`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
      'bottom-center': {
        animation: `${slideInBottom} 300ms ease-out`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
      'bottom-right': {
        animation: `${slideInRight} 300ms ease-out`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
    },
    exiting: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [
    {
      variants: { position: 'top-left', exiting: true },
      style: {
        animation: `${slideOutLeft} 200ms ease-in-out forwards`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } },
      },
    },
    {
      variants: { position: 'bottom-left', exiting: true },
      style: {
        animation: `${slideOutLeft} 200ms ease-in-out forwards`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } },
      },
    },
    {
      variants: { position: 'top-right', exiting: true },
      style: {
        animation: `${slideOutRight} 200ms ease-in-out forwards`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } },
      },
    },
    {
      variants: { position: 'bottom-right', exiting: true },
      style: {
        animation: `${slideOutRight} 200ms ease-in-out forwards`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } },
      },
    },
    {
      variants: { position: 'top-center', exiting: true },
      style: {
        animation: `${slideOutTop} 200ms ease-in-out forwards`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } },
      },
    },
    {
      variants: { position: 'bottom-center', exiting: true },
      style: {
        animation: `${slideOutBottom} 200ms ease-in-out forwards`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } },
      },
    },
  ],
  defaultVariants: { type: 'info', position: 'top-right', exiting: false },
});

export const toastIcon = style({
  width: '20px',
  height: '20px',
  flexShrink: 0,
  marginTop: '2px',
});
globalStyle(`${toastIcon} svg`, { width: '100%', height: '100%' });

export const toastContent = style({
  flex: '1',
  fontSize: vars.typography.size.sm,
  lineHeight: '1.4',
});

export const toastCloseButton = style({
  background: 'none',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: '2px',
  borderRadius: vars.border.radius.sm,
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.7,
  transition: `opacity ${vars.transitions.fast}`,
  selectors: {
    '&:hover': { opacity: 1 },
    '&:focus': { outline: '2px solid currentColor', outlineOffset: '2px' },
  },
});
globalStyle(`${toastCloseButton} svg`, { width: '16px', height: '16px' });

export const toastContainerPosition = styleVariants({
  'top-left': {
    position: 'fixed',
    zIndex: vars.zIndex.toast,
    pointerEvents: 'none',
    top: vars.spacing['4'],
    left: vars.spacing['4'],
  },
  'top-center': {
    position: 'fixed',
    zIndex: vars.zIndex.toast,
    pointerEvents: 'none',
    top: vars.spacing['4'],
    left: '50%',
    transform: 'translateX(-50%)',
  },
  'top-right': {
    position: 'fixed',
    zIndex: vars.zIndex.toast,
    pointerEvents: 'none',
    top: vars.spacing['4'],
    right: vars.spacing['4'],
  },
  'bottom-left': {
    position: 'fixed',
    zIndex: vars.zIndex.toast,
    pointerEvents: 'none',
    bottom: vars.spacing['4'],
    left: vars.spacing['4'],
  },
  'bottom-center': {
    position: 'fixed',
    zIndex: vars.zIndex.toast,
    pointerEvents: 'none',
    bottom: vars.spacing['4'],
    left: '50%',
    transform: 'translateX(-50%)',
  },
  'bottom-right': {
    position: 'fixed',
    zIndex: vars.zIndex.toast,
    pointerEvents: 'none',
    bottom: vars.spacing['4'],
    right: vars.spacing['4'],
  },
});

export const toastContainerInner = style({ pointerEvents: 'auto' });
