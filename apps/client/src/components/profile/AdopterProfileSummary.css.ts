import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const wrap = style({
  marginTop: vars.spacing['5'],
  padding: vars.spacing['4'],
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
});

export const title = style({
  margin: `0 0 ${vars.spacing['1']} 0`,
  fontSize: vars.typography.size.lg,
  color: vars.text.primary,
});

export const subtitle = style({
  margin: `0 0 ${vars.spacing['4']} 0`,
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: vars.spacing['3'],
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
    gap: vars.spacing['2'],
    padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
    borderRadius: vars.border.radius.base,
    fontSize: vars.typography.size.sm,
    color: vars.text.primary,
  },
  variants: {
    known: {
      true: {
        background: vars.colors.successBgSubtle,
        border: `1px solid ${vars.colors.successBorderSubtle}`,
      },
      false: {
        background: vars.background.body,
        border: `1px solid ${vars.border.color.default}`,
      },
    },
  },
  defaultVariants: { known: false },
});

export const icon = style({
  fontSize: vars.typography.size.lg,
});

export const emptyHint = style({
  margin: `${vars.spacing['3']} 0 0 0`,
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
  fontStyle: 'italic',
});

export const statusMark = style({
  marginLeft: 'auto',
});
