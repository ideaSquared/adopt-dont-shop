import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  position: 'relative',
});

export const trigger = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.625rem 1rem',
  background: 'white',
  border: `1px solid ${vars.colors.neutral['300']}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: vars.text.primary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: vars.colors.primary['400'],
    background: vars.colors.primary['50'],
  },
  selectors: {
    '& svg': {
      color: vars.text.secondary,
    },
  },
});

export const dropdown = recipe({
  base: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    background: 'white',
    border: `1px solid ${vars.colors.neutral['200']}`,
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    minWidth: '320px',
  },
  variants: {
    open: {
      true: { display: 'block' },
      false: { display: 'none' },
    },
  },
  defaultVariants: {
    open: false,
  },
});

export const presetsSection = style({
  padding: '0.5rem',
  borderBottom: `1px solid ${vars.colors.neutral['200']}`,
});

export const presetButton = recipe({
  base: {
    display: 'block',
    width: '100%',
    padding: '0.625rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: vars.colors.primary['50'],
      color: vars.colors.primary['700'],
    },
  },
  variants: {
    active: {
      true: {
        background: vars.colors.primary['50'],
        color: vars.colors.primary['700'],
        fontWeight: '600',
      },
      false: {
        background: 'transparent',
        color: vars.text.primary,
        fontWeight: '400',
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const customSection = style({
  padding: '1rem',
});

export const dateInputs = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
});

export const dateInputGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
});

export const label = style({
  fontSize: '0.75rem',
  fontWeight: '500',
  color: vars.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
});

export const dateInput = style({
  padding: '0.5rem',
  border: `1px solid ${vars.colors.neutral['300']}`,
  borderRadius: '6px',
  fontSize: '0.875rem',
  color: vars.text.primary,
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['400'],
    boxShadow: `0 0 0 3px ${vars.colors.primary['100']}`,
  },
});

export const applyButton = style({
  width: '100%',
  marginTop: '0.75rem',
  padding: '0.625rem',
  background: vars.colors.primary['600'],
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.colors.primary['700'],
  },
  ':active': {
    transform: 'scale(0.98)',
  },
});
