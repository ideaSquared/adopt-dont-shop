import { recipe } from '@vanilla-extract/recipes';
import { keyframes, style, styleVariants } from '@vanilla-extract/css';

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
    gap: vars.spacing.sm,
    padding: vars.spacing.md,
    border: '1px solid',
    borderRadius: vars.border.radius.md,
    boxShadow: vars.shadows.lg,
    backdropFilter: 'blur(8px)',
    minWidth: '300px',
    maxWidth: '500px',
    marginBottom: vars.spacing.sm,
    position: 'relative',
  },
  variants: {
    type: {
      success: {
        backgroundColor: `color-mix(in srgb, ${vars.colors.semantic.success['100']} 20%, transparent)`,
        borderColor: vars.colors.semantic.success['500'],
        color: vars.colors.semantic.success['900'],
      },
      error: {
        backgroundColor: `color-mix(in srgb, ${vars.colors.semantic.error['100']} 20%, transparent)`,
        borderColor: vars.colors.semantic.error['500'],
        color: vars.colors.semantic.error['900'],
      },
      warning: {
        backgroundColor: `color-mix(in srgb, ${vars.colors.semantic.warning['100']} 20%, transparent)`,
        borderColor: vars.colors.semantic.warning['500'],
        color: vars.colors.semantic.warning['900'],
      },
      info: {
        backgroundColor: `color-mix(in srgb, ${vars.colors.semantic.info['100']} 20%, transparent)`,
        borderColor: vars.colors.semantic.info['500'],
        color: vars.colors.semantic.info['900'],
      },
    },
    position: {
      'top-left': { animation: `${slideInLeft} 300ms ease-out` },
      'top-center': { animation: `${slideInTop} 300ms ease-out` },
      'top-right': { animation: `${slideInRight} 300ms ease-out` },
      'bottom-left': { animation: `${slideInLeft} 300ms ease-out` },
      'bottom-center': { animation: `${slideInBottom} 300ms ease-out` },
      'bottom-right': { animation: `${slideInRight} 300ms ease-out` },
    },
    exiting: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [
    { variants: { position: 'top-left', exiting: true }, style: { animation: `${slideOutLeft} 200ms ease-in-out forwards` } },
    { variants: { position: 'bottom-left', exiting: true }, style: { animation: `${slideOutLeft} 200ms ease-in-out forwards` } },
    { variants: { position: 'top-right', exiting: true }, style: { animation: `${slideOutRight} 200ms ease-in-out forwards` } },
    { variants: { position: 'bottom-right', exiting: true }, style: { animation: `${slideOutRight} 200ms ease-in-out forwards` } },
    { variants: { position: 'top-center', exiting: true }, style: { animation: `${slideOutTop} 200ms ease-in-out forwards` } },
    { variants: { position: 'bottom-center', exiting: true }, style: { animation: `${slideOutBottom} 200ms ease-in-out forwards` } },
  ],
  defaultVariants: { type: 'info', position: 'top-right', exiting: false },
});

export const toastIcon = style({
  width: '20px',
  height: '20px',
  flexShrink: 0,
  marginTop: '2px',
  selectors: { '& svg': { width: '100%', height: '100%' } },
});

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
    '& svg': { width: '16px', height: '16px' },
  },
});

export const toastContainerPosition = styleVariants({
  'top-left': { position: 'fixed', zIndex: vars.zIndex.toast, pointerEvents: 'none', top: vars.spacing.lg, left: vars.spacing.lg },
  'top-center': { position: 'fixed', zIndex: vars.zIndex.toast, pointerEvents: 'none', top: vars.spacing.lg, left: '50%', transform: 'translateX(-50%)' },
  'top-right': { position: 'fixed', zIndex: vars.zIndex.toast, pointerEvents: 'none', top: vars.spacing.lg, right: vars.spacing.lg },
  'bottom-left': { position: 'fixed', zIndex: vars.zIndex.toast, pointerEvents: 'none', bottom: vars.spacing.lg, left: vars.spacing.lg },
  'bottom-center': { position: 'fixed', zIndex: vars.zIndex.toast, pointerEvents: 'none', bottom: vars.spacing.lg, left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { position: 'fixed', zIndex: vars.zIndex.toast, pointerEvents: 'none', bottom: vars.spacing.lg, right: vars.spacing.lg },
});

export const toastContainerInner = style({ pointerEvents: 'auto' });
