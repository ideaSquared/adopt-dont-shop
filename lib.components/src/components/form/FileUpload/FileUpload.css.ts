import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = recipe({
  base: {},
  variants: {
    fullWidth: {
      true: { display: 'block', width: '100%' },
      false: { display: 'inline-block', width: 'auto' },
    },
  },
  defaultVariants: {
    fullWidth: false,
  },
});

export const label = style({
  display: 'block',
  marginBottom: vars.spacing.xs,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.colors.neutral['700'],
});

export const labelRequired = style({
  selectors: {
    '&::after': {
      content: '" *"',
      color: vars.colors.semantic.error['500'],
    },
  },
});

export const hiddenInput = style({
  position: 'absolute',
  opacity: 0,
  width: 0,
  height: 0,
});

export const dropZone = recipe({
  base: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed',
    borderRadius: vars.border.radius.md,
    backgroundColor: vars.colors.neutral['50'],
    transition: `all ${vars.transitions.fast}`,
    textAlign: 'center',

    selectors: {
      '&:hover': {
        borderColor: vars.colors.primary['500'],
        backgroundColor: vars.colors.primary['100'],
      },
    },
  },
  variants: {
    size: {
      sm: {
        minHeight: '80px',
        padding: vars.spacing.md,
      },
      md: {
        minHeight: '120px',
        padding: vars.spacing.lg,
      },
      lg: {
        minHeight: '160px',
        padding: vars.spacing.xl,
      },
    },
    state: {
      default: {
        borderColor: vars.colors.neutral['300'],
      },
      error: {
        borderColor: vars.colors.semantic.error['500'],
        backgroundColor: vars.colors.semantic.error['100'],
      },
      success: {
        borderColor: vars.colors.semantic.success['500'],
        backgroundColor: vars.colors.semantic.success['100'],
      },
      warning: {
        borderColor: vars.colors.semantic.warning['500'],
        backgroundColor: vars.colors.semantic.warning['100'],
      },
    },
    isDragOver: {
      true: {
        borderColor: vars.colors.primary['500'],
        backgroundColor: vars.colors.primary['100'],
      },
      false: {},
    },
    disabled: {
      true: {
        backgroundColor: vars.colors.neutral['100'],
        color: vars.colors.neutral['400'],
        cursor: 'not-allowed',
        selectors: {
          '&:hover': {
            borderColor: 'inherit',
            backgroundColor: vars.colors.neutral['100'],
          },
        },
      },
      false: {
        cursor: 'pointer',
      },
    },
  },
  defaultVariants: {
    size: 'md',
    state: 'default',
    isDragOver: false,
    disabled: false,
  },
});

export const uploadIcon = style({
  width: '32px',
  height: '32px',
  marginBottom: vars.spacing.sm,
  color: vars.colors.neutral['400'],
});
globalStyle(`${uploadIcon} svg`, { width: '100%', height: '100%' });

export const uploadText = style({
  fontSize: vars.typography.size.sm,
  color: vars.colors.neutral['600'],
  marginBottom: vars.spacing.xs,
});

export const uploadSubtext = style({
  fontSize: vars.typography.size.xs,
  color: vars.colors.neutral['500'],
});

export const fileList = style({
  marginTop: vars.spacing.md,
});

export const fileItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: vars.spacing.sm,
  border: `1px solid ${vars.colors.neutral['200']}`,
  borderRadius: vars.border.radius.sm,
  backgroundColor: vars.colors.neutral['50'],
  marginBottom: vars.spacing.xs,

  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const fileInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
});

export const fileName = style({
  fontSize: vars.typography.size.sm,
  color: vars.colors.neutral['700'],
});

export const fileSize = style({
  fontSize: vars.typography.size.xs,
  color: vars.colors.neutral['500'],
});

export const removeButton = style({
  background: 'none',
  border: 'none',
  color: vars.colors.semantic.error['500'],
  cursor: 'pointer',
  padding: vars.spacing.xs,
  borderRadius: vars.border.radius.sm,
  transition: `background-color ${vars.transitions.fast}`,

  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.semantic.error['100'],
    },
    '&:focus': {
      outline: `2px solid ${vars.colors.semantic.error['500']}`,
      outlineOffset: '2px',
    },
  },
});

export const helperText = recipe({
  base: {
    marginTop: vars.spacing.xs,
    fontSize: vars.typography.size.xs,
  },
  variants: {
    state: {
      default: { color: vars.colors.neutral['600'] },
      error: { color: vars.colors.semantic.error['500'] },
      success: { color: vars.colors.semantic.success['500'] },
      warning: { color: vars.colors.semantic.warning['500'] },
    },
  },
  defaultVariants: {
    state: 'default',
  },
});
