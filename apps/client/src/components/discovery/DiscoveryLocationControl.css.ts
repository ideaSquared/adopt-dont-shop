import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '0.75rem 1rem',
  borderRadius: vars.border.radius.lg,
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
});

export const row = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.75rem',
});

export const hint = style({
  margin: 0,
  fontSize: '0.9rem',
  color: vars.text.secondary,
});

export const status = recipe({
  base: {
    fontSize: '0.9rem',
    // Keeps the layout steady while the live region is empty.
    minHeight: '1.25rem',
  },
  variants: {
    variant: {
      success: { color: vars.text.success },
      error: { color: vars.text.danger },
      info: { color: vars.text.tertiary },
    },
  },
});
