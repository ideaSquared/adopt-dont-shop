import { recipe } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const root = style({
  width: '100%',
});

export const list = recipe({
  base: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: vars.spacing['2'],
  },
  variants: {
    orientation: {
      horizontal: { flexDirection: 'row', alignItems: 'flex-start' },
      vertical: { flexDirection: 'column' },
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

export const step = recipe({
  base: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: vars.spacing['2'],
  },
  variants: {
    orientation: {
      horizontal: { flex: 1 },
      vertical: { flex: 'none' },
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

export const connector = recipe({
  base: {
    flex: 1,
    minWidth: vars.spacing['4'],
    height: vars.border.width.base,
    backgroundColor: vars.border.color.default,
  },
  variants: {
    complete: {
      true: { backgroundColor: vars.colors.primary },
      false: {},
    },
  },
  defaultVariants: {
    complete: false,
  },
});

export const control = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: vars.spacing['2'],
    margin: 0,
    padding: vars.spacing['1'],
    background: 'transparent',
    border: 'none',
    borderRadius: vars.border.radius.base,
    textAlign: 'left',
    font: 'inherit',
    color: 'inherit',
  },
  variants: {
    clickable: {
      true: {
        cursor: 'pointer',
        selectors: {
          '&:hover': {
            backgroundColor: vars.background.muted,
          },
          '&:focus-visible': {
            outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
            outlineOffset: vars.spacing['1'],
          },
        },
      },
      false: {
        cursor: 'default',
      },
    },
  },
  defaultVariants: {
    clickable: false,
  },
});

export const marker = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: vars.spacing['5'],
    height: vars.spacing['5'],
    borderRadius: vars.border.radius.pill,
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.semibold,
    border: `${vars.border.width.base} solid`,
  },
  variants: {
    status: {
      complete: {
        backgroundColor: vars.colors.primary,
        borderColor: vars.colors.primary,
        color: vars.text.inverse,
      },
      current: {
        backgroundColor: vars.colors.primaryBgSubtle,
        borderColor: vars.colors.primary,
        color: vars.colors.primaryTextEmphasis,
      },
      upcoming: {
        backgroundColor: vars.background.surface,
        borderColor: vars.border.color.default,
        color: vars.text.muted,
      },
    },
  },
  defaultVariants: {
    status: 'upcoming',
  },
});

export const checkIcon = style({
  width: '60%',
  height: '60%',
});

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const title = recipe({
  base: {
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    lineHeight: vars.typography.lineHeight.snug,
  },
  variants: {
    status: {
      complete: { color: vars.text.primary },
      current: { color: vars.text.primary },
      upcoming: { color: vars.text.muted },
    },
  },
  defaultVariants: {
    status: 'upcoming',
  },
});

export const description = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.muted,
  lineHeight: vars.typography.lineHeight.snug,
});

export const optional = style({
  fontSize: vars.typography.size.xs,
  fontStyle: 'italic',
  color: vars.text.tertiary,
});

export const visuallyHidden = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  border: 0,
  clip: 'rect(0, 0, 0, 0)',
});
