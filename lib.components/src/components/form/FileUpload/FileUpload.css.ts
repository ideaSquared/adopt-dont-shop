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
  marginBottom: vars.spacing['1'],
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.secondary,
});

export const labelRequired = style({
  selectors: {
    '&::after': {
      content: '" *"',
      color: vars.colors.danger,
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
    borderRadius: vars.border.radius.base,
    backgroundColor: vars.background.body,
    transition: `all ${vars.transitions.fast}`,
    textAlign: 'center',

    selectors: {
      '&:hover': {
        borderColor: vars.colors.primary,
        backgroundColor: vars.colors.primaryBgSubtle,
      },
    },
  },
  variants: {
    size: {
      sm: {
        minHeight: '80px',
        padding: vars.spacing['3'],
      },
      md: {
        minHeight: '120px',
        padding: vars.spacing['4'],
      },
      lg: {
        minHeight: '160px',
        padding: vars.spacing['5'],
      },
    },
    state: {
      default: {
        borderColor: vars.border.color.default,
      },
      error: {
        borderColor: vars.colors.danger,
        backgroundColor: vars.colors.dangerBgSubtle,
      },
      success: {
        borderColor: vars.colors.success,
        backgroundColor: vars.colors.successBgSubtle,
      },
      warning: {
        borderColor: vars.colors.warning,
        backgroundColor: vars.colors.warningBgSubtle,
      },
    },
    isDragOver: {
      true: {
        borderColor: vars.colors.primary,
        backgroundColor: vars.colors.primaryBgSubtle,
      },
      false: {},
    },
    disabled: {
      true: {
        backgroundColor: vars.background.muted,
        color: vars.border.color.strong,
        cursor: 'not-allowed',
        selectors: {
          '&:hover': {
            borderColor: 'inherit',
            backgroundColor: vars.background.muted,
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
  marginBottom: vars.spacing['2'],
  color: vars.border.color.strong,
});
globalStyle(`${uploadIcon} svg`, { width: '100%', height: '100%' });

export const uploadText = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
  marginBottom: vars.spacing['1'],
});

export const uploadSubtext = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.muted,
});

export const fileList = style({
  marginTop: vars.spacing['3'],
});

export const fileItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: vars.spacing['2'],
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: vars.border.radius.sm,
  backgroundColor: vars.background.body,
  marginBottom: vars.spacing['1'],

  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const fileInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const fileName = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
});

export const fileSize = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.muted,
});

export const removeButton = style({
  background: 'none',
  border: 'none',
  color: vars.colors.danger,
  cursor: 'pointer',
  padding: vars.spacing['1'],
  borderRadius: vars.border.radius.sm,
  transition: `background-color ${vars.transitions.fast}`,

  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.dangerBgSubtle,
    },
    '&:focus': {
      outline: `2px solid ${vars.colors.danger}`,
      outlineOffset: '2px',
    },
  },
});

export const helperText = recipe({
  base: {
    marginTop: vars.spacing['1'],
    fontSize: vars.typography.size.xs,
  },
  variants: {
    state: {
      default: { color: vars.text.tertiary },
      error: { color: vars.colors.danger },
      success: { color: vars.colors.success },
      warning: { color: vars.colors.warning },
    },
  },
  defaultVariants: {
    state: 'default',
  },
});
