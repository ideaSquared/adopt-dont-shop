import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const stepContainer = style({
  maxWidth: '600px',
});

export const stepTitle = style({
  fontSize: '1.5rem',
  color: vars.text.primary,
  marginBottom: '0.5rem',
});

export const stepDescription = style({
  color: vars.text.secondary,
  marginBottom: '2rem',
});

export const form = style({
  display: 'grid',
  gap: '1.5rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
});

export const label = style({
  fontWeight: 500,
  color: vars.text.primary,
  marginBottom: '0.5rem',
});

export const textArea = recipe({
  base: {
    width: '100%',
    minHeight: '100px',
    padding: '0.75rem',
    borderRadius: '4px',
    background: vars.background.primary,
    color: vars.text.primary,
    resize: 'vertical',
    ':focus': {
      outline: 'none',
    },
  },
  variants: {
    hasError: {
      true: {
        border: `1px solid ${vars.colors.semantic.error['500']}`,
        ':focus': {
          borderColor: vars.colors.semantic.error['500'],
          boxShadow: `0 0 0 2px ${vars.colors.semantic.error['100']}`,
        },
      },
      false: {
        border: `1px solid ${vars.border.color.secondary}`,
        ':focus': {
          borderColor: vars.colors.primary['500'],
          boxShadow: `0 0 0 2px ${vars.colors.primary['100']}`,
        },
      },
    },
  },
  defaultVariants: { hasError: false },
});

export const checkboxGroup = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.5rem',
  marginTop: '1rem',
});

export const checkboxLabel = style({
  fontSize: '0.9rem',
  color: vars.text.primary,
  lineHeight: 1.5,
});

export const errorMessage = style({
  color: vars.colors.semantic.error['500'],
  fontSize: '0.875rem',
  marginTop: '0.25rem',
});

export const checkboxInput = recipe({
  base: {
    margin: 0,
    ':focus': {
      outline: 'none',
    },
  },
  variants: {
    hasError: {
      true: {
        border: `1px solid ${vars.colors.semantic.error['500']}`,
        ':focus': {
          boxShadow: `0 0 0 2px ${vars.colors.semantic.error['100']}`,
        },
      },
      false: {
        border: `1px solid ${vars.border.color.secondary}`,
        ':focus': {
          boxShadow: `0 0 0 2px ${vars.colors.primary['100']}`,
        },
      },
    },
  },
  defaultVariants: { hasError: false },
});
