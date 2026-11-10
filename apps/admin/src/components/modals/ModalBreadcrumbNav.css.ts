import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const wrapper = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing['3'],
  padding: `${vars.spacing['2']} 0 ${vars.spacing['3']} 0`,
  borderBottom: '1px solid #e5e7eb',
  marginBottom: vars.spacing['3'],
});

export const breadcrumb = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  flexWrap: 'wrap',
  fontSize: '0.8125rem',
  color: '#6b7280',
  minWidth: 0,
});

export const segmentLink = style({
  color: '#4b5563',
  textDecoration: 'none',
  borderRadius: vars.border.radius.sm,
  padding: '0.125rem 0.25rem',
  ':hover': {
    color: '#111827',
    textDecoration: 'underline',
  },
  ':focus-visible': {
    outline: '2px solid #667eea',
    outlineOffset: '2px',
  },
});

export const segmentCurrent = style({
  color: '#111827',
  fontWeight: vars.typography.weight.semibold,
});

export const separator = style({
  color: '#9ca3af',
  userSelect: 'none',
});

export const navButtons = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['1'],
  flexShrink: 0,
});
