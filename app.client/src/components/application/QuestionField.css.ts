import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const fieldGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
  marginBottom: '1.25rem',
});

export const label = style({
  fontSize: '0.9375rem',
  fontWeight: 500,
  color: vars.text.primary,
});

export const requiredMark = style({
  color: vars.colors.semantic.error['500'],
  marginLeft: '0.125rem',
});

export const helpText = style({
  fontSize: '0.8125rem',
  color: vars.text.secondary,
  margin: 0,
});

const baseInputStyle = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.9375rem',
  width: '100%',
  boxSizing: 'border-box' as const,
  outline: 'none',
  transition: 'border-color 0.15s',
};

export const input = recipe({
  base: {
    ...baseInputStyle,
    color: vars.text.primary,
    background: vars.background.primary,
    ':focus': {
      borderColor: vars.colors.primary['500'],
      boxShadow: `0 0 0 2px ${vars.colors.primary['100']}`,
    },
  },
  variants: {
    hasError: {
      true: {
        border: `1px solid ${vars.colors.semantic.error['500']}`,
      },
      false: {
        border: `1px solid ${vars.border.color.primary}`,
      },
    },
  },
  defaultVariants: {
    hasError: false,
  },
});

export const select = recipe({
  base: {
    ...baseInputStyle,
    color: vars.text.primary,
    background: vars.background.primary,
    cursor: 'pointer',
    ':focus': {
      borderColor: vars.colors.primary['500'],
      boxShadow: `0 0 0 2px ${vars.colors.primary['100']}`,
    },
  },
  variants: {
    hasError: {
      true: {
        border: `1px solid ${vars.colors.semantic.error['500']}`,
      },
      false: {
        border: `1px solid ${vars.border.color.primary}`,
      },
    },
  },
  defaultVariants: {
    hasError: false,
  },
});

export const textArea = recipe({
  base: {
    ...baseInputStyle,
    color: vars.text.primary,
    background: vars.background.primary,
    resize: 'vertical',
    minHeight: '80px',
    ':focus': {
      borderColor: vars.colors.primary['500'],
      boxShadow: `0 0 0 2px ${vars.colors.primary['100']}`,
    },
  },
  variants: {
    hasError: {
      true: {
        border: `1px solid ${vars.colors.semantic.error['500']}`,
      },
      false: {
        border: `1px solid ${vars.border.color.primary}`,
      },
    },
  },
  defaultVariants: {
    hasError: false,
  },
});

export const checkboxGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const checkboxLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9375rem',
  color: vars.text.primary,
  cursor: 'pointer',
});

export const errorText = style({
  fontSize: '0.8125rem',
  color: vars.colors.semantic.error['600'],
  margin: 0,
});
