import { keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../../styles/theme.css';

const slideUpAndFade = keyframes({
  from: { opacity: 0, transform: 'translateY(2px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
});

const slideDownAndFade = keyframes({
  from: { opacity: 0, transform: 'translateY(-2px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
});

const slideRightAndFade = keyframes({
  from: { opacity: 0, transform: 'translateX(-2px)' },
  to: { opacity: 1, transform: 'translateX(0)' },
});

const slideLeftAndFade = keyframes({
  from: { opacity: 0, transform: 'translateX(2px)' },
  to: { opacity: 1, transform: 'translateX(0)' },
});

export const container = recipe({
  base: {
    position: 'relative',
  },
  variants: {
    fullWidth: {
      true: { display: 'block', width: '100%' },
      false: { display: 'inline-block', width: 'auto' },
    },
  },
  defaultVariants: { fullWidth: false },
});

export const label = recipe({
  base: {
    display: 'block',
    marginBottom: vars.spacing['1'],
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    color: vars.text.secondary,
  },
  variants: {
    required: {
      true: {
        selectors: {
          '&::after': {
            content: ' *',
            color: vars.colors.danger,
          },
        },
      },
      false: {},
    },
  },
  defaultVariants: { required: false },
});

export const selectContainer = recipe({
  base: {
    position: 'relative',
  },
  variants: {
    fullWidth: {
      true: { width: '100%' },
      false: { width: 'auto' },
    },
  },
  defaultVariants: { fullWidth: false },
});

export const trigger = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: '200px',
    border: '1px solid',
    borderRadius: vars.spacing['1'],
    backgroundColor: vars.background.body,
    transition: `all ${vars.transitions.fast}`,
    gap: vars.spacing['1'],
    selectors: {
      '&:focus': {
        outline: 'none',
      },
    },
  },
  variants: {
    size: {
      sm: {
        minHeight: '32px',
        fontSize: '14px',
        paddingLeft: vars.spacing['1'],
        paddingRight: vars.spacing['1'],
      },
      md: {
        minHeight: '40px',
        fontSize: '16px',
        paddingLeft: vars.spacing['2'],
        paddingRight: vars.spacing['2'],
      },
      lg: {
        minHeight: '48px',
        fontSize: '18px',
        paddingLeft: vars.spacing['3'],
        paddingRight: vars.spacing['3'],
      },
    },
    state: {
      default: {
        borderColor: vars.border.color.default,
        selectors: {
          '&:focus-within': {
            borderColor: vars.colors.primary,
            boxShadow: `0 0 0 3px ${vars.colors.primaryBorderSubtle}`,
          },
        },
      },
      error: {
        borderColor: vars.colors.danger,
        selectors: {
          '&:focus-within': {
            borderColor: vars.colors.danger,
            boxShadow: `0 0 0 3px ${vars.colors.dangerBorderSubtle}`,
          },
        },
      },
      success: {
        borderColor: vars.colors.success,
        selectors: {
          '&:focus-within': {
            borderColor: vars.colors.success,
            boxShadow: `0 0 0 3px ${vars.colors.successBorderSubtle}`,
          },
        },
      },
      warning: {
        borderColor: vars.colors.warning,
        selectors: {
          '&:focus-within': {
            borderColor: vars.colors.warning,
            boxShadow: `0 0 0 3px ${vars.colors.warningBorderSubtle}`,
          },
        },
      },
    },
    disabled: {
      true: {
        backgroundColor: vars.background.muted,
        color: vars.border.color.strong,
        cursor: 'not-allowed',
      },
      false: {
        cursor: 'pointer',
      },
    },
    fullWidth: {
      true: { width: '100%' },
      false: { width: 'auto' },
    },
  },
  defaultVariants: {
    size: 'md',
    state: 'default',
    disabled: false,
    fullWidth: false,
  },
});

export const content = style({
  background: vars.background.body,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.spacing['1'],
  boxShadow: vars.shadows.lg,
  maxHeight: '300px',
  overflow: 'hidden',
  zIndex: 50,
  minWidth: 'var(--radix-select-trigger-width)',
  width: 'var(--radix-select-trigger-width)',
  willChange: 'transform, opacity',
  position: 'relative',
  selectors: {
    '&[data-state="open"]': {
      animation: `${slideDownAndFade} 400ms cubic-bezier(0.16, 1, 0.3, 1)`,
    },
    '&[data-state="closed"]': {
      animation: `${slideUpAndFade} 400ms cubic-bezier(0.16, 1, 0.3, 1)`,
    },
    '&[data-side="top"]': {
      animationName: slideDownAndFade,
    },
    '&[data-side="right"]': {
      animationName: slideLeftAndFade,
    },
    '&[data-side="bottom"]': {
      animationName: slideUpAndFade,
    },
    '&[data-side="left"]': {
      animationName: slideRightAndFade,
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});

export const viewport = style({
  padding: vars.spacing['1'],
  maxHeight: '250px',
  overflowY: 'auto',
  selectors: {
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: vars.border.color.default,
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: vars.border.color.strong,
    },
  },
});

export const searchContainer = style({
  padding: vars.spacing['1'],
  borderBottom: `1px solid ${vars.border.color.muted}`,
});

export const searchInput = style({
  width: '100%',
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.spacing['1'],
  fontSize: vars.typography.size.sm,
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: vars.colors.primary,
      boxShadow: `0 0 0 2px ${vars.colors.primaryBorderSubtle}`,
    },
  },
});

export const selectItem = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    padding: vars.spacing['2'],
    transition: `background-color ${vars.transitions.fast}`,
    outline: 'none',
    borderRadius: vars.spacing['1'],
    margin: '1px 0',
    gap: vars.spacing['1'],
    selectors: {
      '&[data-state="checked"]': {
        backgroundColor: vars.colors.primaryBgSubtle,
      },
    },
  },
  variants: {
    disabled: {
      true: {
        cursor: 'not-allowed',
        color: vars.border.color.strong,
        selectors: {
          '&[data-highlighted]': {
            backgroundColor: 'transparent',
          },
        },
      },
      false: {
        cursor: 'pointer',
        color: vars.text.primary,
        selectors: {
          '&[data-highlighted]': {
            backgroundColor: vars.background.muted,
          },
        },
      },
    },
  },
  defaultVariants: { disabled: false },
});

export const valueContainer = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: vars.spacing['1'],
  flex: 1,
  minWidth: 0,
});

export const singleValue = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['1'],
  color: vars.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const multiValue = style({
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: vars.colors.primaryBgSubtle,
  color: vars.colors.primaryActive,
  padding: `2px ${vars.spacing['1']}`,
  borderRadius: vars.spacing['1'],
  fontSize: vars.typography.size.sm,
  gap: vars.spacing['1'],
  maxWidth: '200px',
  overflow: 'hidden',
});

export const multiValueRemove = style({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  width: '16px',
  height: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  transition: `background-color ${vars.transitions.fast}`,
  color: vars.colors.primaryHover,
  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.primaryBorderSubtle,
    },
  },
});

export const clearButton = style({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  transition: `background-color ${vars.transitions.fast}`,
  color: vars.border.color.strong,
  selectors: {
    '&:hover': {
      backgroundColor: vars.background.muted,
    },
  },
});

export const placeholder = style({
  color: vars.border.color.strong,
  flex: 1,
  textAlign: 'left',
});

export const helperText = recipe({
  base: {
    marginTop: vars.spacing['1'],
    fontSize: vars.typography.size.sm,
  },
  variants: {
    state: {
      default: { color: vars.text.tertiary },
      error: { color: vars.colors.danger },
      success: { color: vars.colors.success },
      warning: { color: vars.colors.warning },
    },
  },
  defaultVariants: { state: 'default' },
});

export const iconRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

export const emptyMessage = style({
  padding: '8px',
  textAlign: 'center',
  color: '#9ca3af',
});
