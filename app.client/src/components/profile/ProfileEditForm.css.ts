import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const label = style({
  fontWeight: 500,
  color: vars.text.primary,
  fontSize: '0.875rem',
});

export const select = style({
  padding: '0.75rem',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '8px',
  background: vars.background.primary,
  color: vars.text.primary,
  fontSize: '1rem',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
    boxShadow: `0 0 0 3px ${vars.colors.primary['100']}`,
  },
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  marginTop: '1rem',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});

export const formTitle = style({
  fontSize: '1.25rem',
  color: vars.text.primary,
  marginBottom: '1.5rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const unsavedBadge = style({
  background: '#fef3c7',
  color: '#92400e',
  padding: '0.25rem 0.5rem',
  borderRadius: '12px',
  fontSize: '0.75rem',
  fontWeight: 500,
});

export const keyboardHint = style({
  fontSize: '0.75rem',
  color: vars.text.secondary,
  textAlign: 'center',
  marginTop: '0.5rem',
  opacity: 0.7,
});

export const characterCount = recipe({
  base: {
    fontSize: '0.75rem',
    textAlign: 'right',
    marginTop: '0.25rem',
  },
  variants: {
    isNearLimit: {
      true: {
        color: '#d97706',
      },
      false: {
        color: vars.text.secondary,
      },
    },
  },
  defaultVariants: { isNearLimit: false },
});
