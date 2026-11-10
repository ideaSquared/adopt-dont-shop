import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const formGroup = style({
  marginBottom: '1.25rem',
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const infoBox = style({
  background: vars.background.muted,
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginBottom: '1.25rem',
});

export const infoLabel = style({
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.375rem',
});

export const infoValue = style({
  fontSize: '0.9375rem',
  color: vars.text.primary,
  fontWeight: vars.typography.weight.medium,
});

export const helpText = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  marginTop: '0.375rem',
});

export const templateGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0.75rem',
  marginBottom: '1.25rem',
});

export const templateCard = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: vars.spacing['3'],
  border: `2px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  background: vars.background.surface,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textAlign: 'left',
  ':hover': {
    borderColor: '#667eea',
    background: '#f5f3ff',
  },
  ':disabled': {
    cursor: 'not-allowed',
    opacity: 0.6,
  },
});

export const templateCardSelected = style({
  borderColor: '#667eea',
  background: '#f5f3ff',
});

export const templateIcon = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: vars.border.radius.base,
  background: vars.background.muted,
  color: vars.text.tertiary,
  marginBottom: '0.75rem',
});

export const templateIconSelected = style({
  background: '#ede9fe',
  color: '#667eea',
});

export const templateName = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  marginBottom: vars.spacing['1'],
});

export const templateDescription = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  lineHeight: 1.4,
});

export const templatePreview = style({
  background: vars.background.muted,
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginBottom: '1.25rem',
});

export const previewLabel = style({
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: vars.spacing['2'],
});

export const previewSubject = style({
  fontSize: '0.9375rem',
  color: vars.text.primary,
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['2'],
});

export const previewDescription = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
  lineHeight: 1.5,
});

export const footerButtons = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
});

export const modalHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const modalHeaderTitle = style({
  fontWeight: vars.typography.weight.semibold,
  fontSize: vars.typography.size.lg,
});

export const modalHeaderSubtitle = style({
  fontSize: vars.typography.size.sm,
  opacity: 0.8,
  marginTop: '0.125rem',
});

export const label = style({
  display: 'block',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.secondary,
  marginBottom: vars.spacing['2'],
});
