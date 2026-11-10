import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const description = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
  lineHeight: 1.5,
  margin: 0,
});

export const countBadge = style({
  display: 'inline-block',
  padding: '0.25rem 0.75rem',
  borderRadius: vars.border.radius.pill,
  background: '#dbeafe',
  color: '#1e40af',
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  width: 'fit-content',
});

export const severityWarning = style({
  background: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: vars.border.radius.base,
  padding: '0.75rem 1rem',
  fontSize: vars.typography.size.sm,
  color: '#92400e',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const severityCritical = style({
  background: '#fee2e2',
  border: '1px solid #dc2626',
  borderRadius: vars.border.radius.base,
  padding: '0.75rem 1rem',
  fontSize: vars.typography.size.sm,
  color: '#991b1b',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
});

export const resultBanner = style({
  background: '#dcfce7',
  border: '1px solid #16a34a',
  borderRadius: vars.border.radius.base,
  padding: '0.75rem 1rem',
  fontSize: vars.typography.size.sm,
  color: '#166534',
});

export const resultBannerFailed = style({
  background: '#fee2e2',
  border: '1px solid #dc2626',
  color: '#991b1b',
});

export const severityHeading = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});
