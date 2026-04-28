import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '../../../lib.components/src/styles/theme.css';

export const pickerTrigger = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '1rem',
  opacity: '0',
  transition: 'opacity 0.15s ease, background 0.15s ease',
  color: vars.text.secondary,
  selectors: {
    '&:hover': {
      background: vars.background.secondary,
      opacity: '1',
    },
  },
});

export const pickerWrapper = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
});

export const pickerPopover = styleVariants({
  above: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '100',
    background: vars.background.primary,
    border: `1px solid ${vars.border.color.secondary}`,
    borderRadius: '24px',
    padding: '0.25rem 0.375rem',
    display: 'flex',
    gap: '0.125rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    marginBottom: '0.25rem',
  },
  below: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '100',
    background: vars.background.primary,
    border: `1px solid ${vars.border.color.secondary}`,
    borderRadius: '24px',
    padding: '0.25rem 0.375rem',
    display: 'flex',
    gap: '0.125rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    marginTop: '0.25rem',
  },
});

export const emojiButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '1.125rem',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      background: vars.background.secondary,
      transform: 'scale(1.2)',
    },
    '&:active': {
      transform: 'scale(0.9)',
    },
  },
});
