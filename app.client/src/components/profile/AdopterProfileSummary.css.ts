import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const wrap = style({
  marginTop: '2rem',
  padding: '1.5rem',
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '0.75rem',
});

export const title = style({
  margin: '0 0 0.25rem 0',
  fontSize: '1.125rem',
  color: vars.text.primary,
});

export const subtitle = style({
  margin: '0 0 1.25rem 0',
  fontSize: '0.9375rem',
  color: vars.text.secondary,
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.75rem',
  '@media': {
    '(max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const statusPill = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.625rem 0.875rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: vars.text.primary,
  },
  variants: {
    known: {
      true: {
        background: vars.colors.semantic.success['50'],
        border: `1px solid ${vars.colors.semantic.success['200']}`,
      },
      false: {
        background: vars.background.primary,
        border: `1px solid ${vars.border.color.primary}`,
      },
    },
  },
  defaultVariants: { known: false },
});

export const icon = style({
  fontSize: '1.125rem',
});

export const emptyHint = style({
  margin: '0.75rem 0 0 0',
  fontSize: '0.8125rem',
  color: vars.text.secondary,
  fontStyle: 'italic',
});

export const statusMark = style({
  marginLeft: 'auto',
});
