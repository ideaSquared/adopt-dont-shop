import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../../styles/theme.css';

const NARROW = '(max-width: 768px)';

export const root = recipe({
  base: {
    display: 'flex',
    width: '100%',
    minHeight: '0',
    gap: vars.spacing['3'],
    '@media': {
      [NARROW]: {
        display: 'block',
      },
    },
  },
  variants: {
    detailOpen: {
      true: {},
      false: {},
    },
  },
  defaultVariants: {
    detailOpen: false,
  },
});

export const listPane = recipe({
  base: {
    flex: '0 0 320px',
    minWidth: '0',
    overflowY: 'auto',
    borderRight: `1px solid ${vars.border.color.default}`,
    paddingRight: vars.spacing['3'],
  },
  variants: {
    hiddenOnNarrow: {
      true: {
        '@media': {
          [NARROW]: {
            display: 'none',
          },
        },
      },
      false: {
        '@media': {
          [NARROW]: {
            display: 'block',
            flex: '1 1 auto',
            borderRight: 'none',
            paddingRight: '0',
          },
        },
      },
    },
  },
  defaultVariants: {
    hiddenOnNarrow: false,
  },
});

export const detailPane = recipe({
  base: {
    flex: '1 1 auto',
    minWidth: '0',
    overflowY: 'auto',
    paddingLeft: vars.spacing['2'],
    '@media': {
      [NARROW]: {
        paddingLeft: '0',
      },
    },
  },
  variants: {
    visibleOnNarrow: {
      true: {
        '@media': {
          [NARROW]: {
            display: 'block',
          },
        },
      },
      false: {
        '@media': {
          [NARROW]: {
            display: 'none',
          },
        },
      },
    },
  },
  defaultVariants: {
    visibleOnNarrow: false,
  },
});

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const listItemButton = recipe({
  base: {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: vars.border.radius.base,
    padding: vars.spacing['2'],
    cursor: 'pointer',
    color: 'inherit',
    font: 'inherit',
    ':hover': {
      background: vars.background.muted,
    },
    ':focus-visible': {
      outline: `2px solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
  variants: {
    selected: {
      true: {
        background: vars.background.muted,
        borderColor: vars.border.color.default,
      },
      false: {},
    },
  },
  defaultVariants: {
    selected: false,
  },
});

export const backButton = style({
  display: 'none',
  '@media': {
    [NARROW]: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: vars.spacing['1'],
      background: 'transparent',
      border: `1px solid ${vars.border.color.default}`,
      borderRadius: vars.border.radius.base,
      padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
      marginBottom: vars.spacing['2'],
      cursor: 'pointer',
      color: 'inherit',
      font: 'inherit',
    },
  },
});

export const emptyDetail = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  minHeight: '200px',
  color: vars.text.muted,
});

export const emptyList = style({
  padding: vars.spacing['3'],
  color: vars.text.muted,
  textAlign: 'center',
});
