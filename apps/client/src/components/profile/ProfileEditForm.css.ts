import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.spacing['3'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const buttonGroup = style({
  display: 'flex',
  gap: vars.spacing['3'],
  justifyContent: 'flex-end',
  marginTop: vars.spacing['3'],
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});

export const formTitle = style({
  fontSize: vars.typography.size.xl,
  color: vars.text.primary,
  marginBottom: vars.spacing['4'],
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const unsavedBadge = style({
  background: '#fef3c7',
  color: '#92400e',
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  borderRadius: vars.border.radius.lg,
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.medium,
});

export const keyboardHint = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.secondary,
  textAlign: 'center',
  marginTop: vars.spacing['2'],
  opacity: 0.7,
});

export const characterCount = recipe({
  base: {
    fontSize: vars.typography.size.xs,
    textAlign: 'right',
    marginTop: vars.spacing['1'],
  },
  variants: {
    isNearLimit: {
      true: {
        color: '#d97706',
      },
      false: {
        color: vars.text.secondary,
      },
    },
  },
  defaultVariants: { isNearLimit: false },
});

export const submitError = style({
  color: 'red',
  fontSize: vars.typography.size.sm,
});
