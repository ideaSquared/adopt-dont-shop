import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['6'],
});

export const statusBadge = recipe({
  base: {
    display: 'inline-block',
    padding: `${vars.spacing['1']} ${vars.spacing['3']}`,
    borderRadius: vars.border.radius.full,
    fontSize: vars.typography.size.xs,
    fontWeight: vars.typography.weight.semibold,
  },
  variants: {
    enabled: {
      true: {
        backgroundColor: vars.colors.semantic.success['100'],
        color: vars.colors.semantic.success['700'],
      },
      false: {
        backgroundColor: vars.colors.neutral['100'],
        color: vars.colors.neutral['600'],
      },
    },
  },
  defaultVariants: { enabled: false },
});

export const setupStep = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const stepNumber = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: vars.border.radius.full,
  backgroundColor: vars.colors.primary['500'],
  color: 'white',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  flexShrink: 0,
});

export const stepHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
});

export const qrCodeImage = style({
  display: 'block',
  maxWidth: '200px',
  height: 'auto',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['2'],
  background: 'white',
});

export const secretKey = style({
  display: 'block',
  padding: vars.spacing['3'],
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.md,
  fontSize: vars.typography.size.sm,
  letterSpacing: vars.typography.letterSpacing.wide,
  wordBreak: 'break-all',
  userSelect: 'all',
});

export const tokenInput = style({
  padding: vars.spacing['3'],
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.md,
  fontSize: vars.typography.size.xl,
  letterSpacing: vars.typography.letterSpacing.widest,
  textAlign: 'center',
  maxWidth: '200px',
  background: vars.background.primary,
  color: vars.text.primary,
  selectors: {
    '&:focus': {
      outline: 'none',
      borderColor: vars.colors.primary['500'],
      boxShadow: `0 0 0 2px ${vars.colors.primary['100']}`,
    },
  },
});

export const backupCodesGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: vars.spacing['2'],
  maxWidth: '320px',
});

export const backupCode = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.sm,
  fontSize: vars.typography.size.sm,
  textAlign: 'center',
  letterSpacing: vars.typography.letterSpacing.wide,
});

export const description = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
  margin: '0',
  lineHeight: vars.typography.lineHeight.relaxed,
});

export const buttonRow = style({
  display: 'flex',
  gap: vars.spacing['3'],
  flexWrap: 'wrap',
});

export const warningBox = style({
  padding: vars.spacing['4'],
  background: vars.colors.semantic.warning['50'],
  border: `1px solid ${vars.colors.semantic.warning['300']}`,
  borderRadius: vars.border.radius.md,
  fontSize: vars.typography.size.sm,
  color: vars.colors.semantic.warning['800'],
});
