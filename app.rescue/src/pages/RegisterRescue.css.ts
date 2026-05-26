import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  maxWidth: '720px',
  margin: '2rem auto',
  padding: '0 1rem',
});

export const card = style({
  backgroundColor: vars.background.surface,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['6'],
  boxShadow: vars.shadows.base,
});

export const stepIndicator = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.spacing['2'],
  marginBottom: vars.spacing['6'],
});

export const stepDot = style({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: vars.gray['300'],
  transition: 'background-color 0.2s',
});

export const stepDotActive = style({
  backgroundColor: vars.colors.primary,
});

export const stepDotCompleted = style({
  backgroundColor: vars.colors.success,
});

export const stepTitle = style({
  fontSize: vars.typography.size['2xl'],
  fontWeight: 600,
  color: vars.text.primary,
  marginBottom: vars.spacing['4'],
});

export const stepDescription = style({
  color: vars.text.secondary,
  marginBottom: vars.spacing['4'],
});

export const fieldGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['4'],
});

export const fieldRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.spacing['3'],
  '@media': {
    'screen and (max-width: 600px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const field = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const label = style({
  fontSize: vars.typography.size.sm,
  fontWeight: 500,
  color: vars.text.primary,
});

export const input = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  borderRadius: vars.border.radius.base,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  fontSize: vars.typography.size.base,
  lineHeight: vars.typography.lineHeight.normal,
  color: vars.text.primary,
  backgroundColor: vars.background.surface,
  outline: 'none',
  transition: 'border-color 0.2s',
  ':focus': {
    borderColor: vars.border.color.focus,
  },
});

export const fieldError = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.danger,
});

export const buttonRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: vars.spacing['3'],
  marginTop: vars.spacing['4'],
});

export const reviewSection = style({
  marginBottom: vars.spacing['3'],
});

export const reviewLabel = style({
  fontWeight: 600,
  color: vars.text.primary,
  fontSize: vars.typography.size.sm,
});

export const reviewValue = style({
  color: vars.text.secondary,
  fontSize: vars.typography.size.base,
});

export const successContainer = style({
  textAlign: 'center',
  padding: vars.spacing['6'],
});

export const successTitle = style({
  fontSize: vars.typography.size['2xl'],
  fontWeight: 600,
  color: vars.colors.success,
  marginBottom: vars.spacing['3'],
});

export const successMessage = style({
  color: vars.text.secondary,
  lineHeight: vars.typography.lineHeight.relaxed,
});

export const errorAlert = style({
  padding: vars.spacing['3'],
  borderRadius: vars.border.radius.base,
  backgroundColor: vars.background.danger,
  color: vars.text.danger,
  marginBottom: vars.spacing['4'],
  border: `${vars.border.width.thin} solid ${vars.border.color.danger}`,
});

export const optionalHint = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  marginTop: vars.spacing['1'],
});
