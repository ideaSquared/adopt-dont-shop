import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../../styles/theme.css';

export const container = recipe({
  base: {
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: vars.spacing.md,
    paddingRight: vars.spacing.md,
    '@media': {
      '(max-width: 768px)': {
        paddingLeft: vars.spacing.sm,
        paddingRight: vars.spacing.sm,
      },
    },
  },
  variants: {
    size: {
      sm: { maxWidth: '640px' },
      md: { maxWidth: '768px' },
      lg: { maxWidth: '1024px' },
      xl: { maxWidth: '1280px' },
      full: { maxWidth: '100%' },
    },
    fluid: {
      true: { maxWidth: '100%', width: '100%' },
      false: {},
    },
    centerContent: {
      true: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
      false: {},
    },
  },
  defaultVariants: {
    size: 'lg',
    fluid: false,
    centerContent: false,
  },
});
