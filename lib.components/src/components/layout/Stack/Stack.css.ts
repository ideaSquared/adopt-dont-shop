import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../../styles/theme.css';

export const stack = recipe({
  base: {
    display: 'flex',
  },
  variants: {
    direction: {
      vertical: { flexDirection: 'column' },
      horizontal: { flexDirection: 'row' },
    },
    spacing: {
      none: { gap: '0' },
      xs: { gap: vars.spacing.xs },
      sm: { gap: vars.spacing.sm },
      md: { gap: vars.spacing.md },
      lg: { gap: vars.spacing.lg },
      xl: { gap: vars.spacing.xl },
    },
    align: {
      start: { alignItems: 'flex-start' },
      center: { alignItems: 'center' },
      end: { alignItems: 'flex-end' },
      stretch: { alignItems: 'stretch' },
    },
    justify: {
      start: { justifyContent: 'flex-start' },
      center: { justifyContent: 'center' },
      end: { justifyContent: 'flex-end' },
      between: { justifyContent: 'space-between' },
      around: { justifyContent: 'space-around' },
      evenly: { justifyContent: 'space-evenly' },
    },
    wrap: {
      true: { flexWrap: 'wrap' },
      false: { flexWrap: 'nowrap' },
    },
    fullWidth: {
      true: { width: '100%' },
      false: {},
    },
    fullHeight: {
      true: { height: '100%' },
      false: {},
    },
  },
  defaultVariants: {
    direction: 'vertical',
    spacing: 'md',
    align: 'stretch',
    justify: 'start',
    wrap: false,
    fullWidth: false,
    fullHeight: false,
  },
});
