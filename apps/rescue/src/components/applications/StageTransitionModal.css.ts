import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const subtitle = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  margin: `0 0 ${vars.spacing['3']} 0`,
});

export const stageDisplay = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  margin: `${vars.spacing['4']} 0`,
  padding: vars.spacing['3'],
  background: '#f9fafb',
  borderRadius: vars.border.radius.base,
});

export const stageBox = style({
  flex: 1,
  padding: '0.75rem',
  color: 'white',
  borderRadius: '0.375rem',
  textAlign: 'center',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
});

export const arrow = style({
  fontSize: vars.typography.size.xl,
  color: '#9ca3af',
});

export const formField = style({
  marginBottom: vars.spacing['3'],
});

export const label = style({
  display: 'block',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: '#374151',
  marginBottom: vars.spacing['2'],
});

export const actionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  marginBottom: vars.spacing['3'],
});

export const actionOption = recipe({
  base: {
    padding: '0.75rem',
    borderRadius: '0.375rem',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      borderColor: '#3b82f6',
      background: '#eff6ff',
    },
  },
  variants: {
    selected: {
      true: {
        border: '2px solid #3b82f6',
        background: '#eff6ff',
      },
      false: {
        border: '2px solid #e5e7eb',
        background: 'white',
      },
    },
  },
  defaultVariants: {
    selected: false,
  },
});

export const actionLabel = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
  marginBottom: vars.spacing['1'],
});

export const actionDescription = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  marginTop: vars.spacing['4'],
});

export const noActionsMessage = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  textAlign: 'center',
  padding: vars.spacing['3'],
});
