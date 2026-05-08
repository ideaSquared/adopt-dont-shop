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
    marginBottom: vars.spacing.xs,
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    color: vars.colors.neutral['700'],
  },
  variants: {
    required: {
      true: {
        selectors: {
          '&::after': {
            content: ' *',
            color: vars.colors.semantic.error['500'],
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
    borderRadius: vars.spacing.xs,
    backgroundColor: vars.colors.neutral['50'],
    transition: `all ${vars.transitions.fast}`,
    gap: vars.spacing.xs,
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
        paddingLeft: vars.spacing.xs,
        paddingRight: vars.spacing.xs,
      },
      md: {
        minHeight: '40px',
        fontSize: '16px',
        paddingLeft: vars.spacing.sm,
        paddingRight: vars.spacing.sm,
      },
      lg: {
        minHeight: '48px',
        fontSize: '18px',
        paddingLeft: vars.spacing.md,
        paddingRight: vars.spacing.md,
      },
    },
    state: {
      default: {
        borderColor: vars.colors.neutral['300'],
        selectors: {
          '&:focus-within': {
            borderColor: vars.colors.primary['500'],
            boxShadow: `0 0 0 3px ${vars.colors.primary['200']}`,
          },
        },
      },
      error: {
        borderColor: vars.colors.semantic.error['500'],
        selectors: {
          '&:focus-within': {
            borderColor: vars.colors.semantic.error['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.error['200']}`,
          },
        },
      },
      success: {
        borderColor: vars.colors.semantic.success['500'],
        selectors: {
          '&:focus-within': {
            borderColor: vars.colors.semantic.success['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.success['200']}`,
          },
        },
      },
      warning: {
        borderColor: vars.colors.semantic.warning['500'],
        selectors: {
          '&:focus-within': {
            borderColor: vars.colors.semantic.warning['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.warning['200']}`,
          },
        },
      },
    },
    disabled: {
      true: {
        backgroundColor: vars.colors.neutral['100'],
        color: vars.colors.neutral['400'],
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
  background: vars.colors.neutral['50'],
  border: `1px solid ${vars.colors.neutral['300']}`,
  borderRadius: vars.spacing.xs,
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
});

export const viewport = style({
  padding: vars.spacing.xs,
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
      backgroundColor: vars.colors.neutral['300'],
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: vars.colors.neutral['400'],
    },
  },
});

export const searchContainer = style({
  padding: vars.spacing.xs,
  borderBottom: `1px solid ${vars.colors.neutral['200']}`,
});

export const searchInput = style({
  width: '100%',
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  border: `1px solid ${vars.colors.neutral['300']}`,
  borderRadius: vars.spacing.xs,
  fontSize: vars.typography.size.sm,
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: vars.colors.primary['500'],
      boxShadow: `0 0 0 2px ${vars.colors.primary['200']}`,
    },
  },
});

export const selectItem = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    padding: vars.spacing.sm,
    transition: `background-color ${vars.transitions.fast}`,
    outline: 'none',
    borderRadius: vars.spacing.xs,
    margin: '1px 0',
    gap: vars.spacing.xs,
    selectors: {
      '&[data-state="checked"]': {
        backgroundColor: vars.colors.primary['100'],
      },
    },
  },
  variants: {
    disabled: {
      true: {
        cursor: 'not-allowed',
        color: vars.colors.neutral['400'],
        selectors: {
          '&[data-highlighted]': {
            backgroundColor: 'transparent',
          },
        },
      },
      false: {
        cursor: 'pointer',
        color: vars.colors.neutral['900'],
        selectors: {
          '&[data-highlighted]': {
            backgroundColor: vars.colors.neutral['100'],
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
  gap: vars.spacing.xs,
  flex: 1,
  minWidth: 0,
});

export const singleValue = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
  color: vars.colors.neutral['900'],
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const multiValue = style({
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: vars.colors.primary['100'],
  color: vars.colors.primary['700'],
  padding: `2px ${vars.spacing.xs}`,
  borderRadius: vars.spacing.xs,
  fontSize: vars.typography.size.sm,
  gap: vars.spacing.xs,
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
  color: vars.colors.primary['600'],
  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.primary['200'],
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
  color: vars.colors.neutral['400'],
  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.neutral['100'],
    },
  },
});

export const placeholder = style({
  color: vars.colors.neutral['400'],
  flex: 1,
  textAlign: 'left',
});

export const helperText = recipe({
  base: {
    marginTop: vars.spacing.xs,
    fontSize: vars.typography.size.sm,
  },
  variants: {
    state: {
      default: { color: vars.colors.neutral['600'] },
      error: { color: vars.colors.semantic.error['500'] },
      success: { color: vars.colors.semantic.success['500'] },
      warning: { color: vars.colors.semantic.warning['500'] },
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
