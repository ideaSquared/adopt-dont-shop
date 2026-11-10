import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const iconWrap = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: '#ffffff',
    flexShrink: 0,
  },
  variants: {
    variant: {
      danger: { color: '#ef4444' },
      warning: { color: '#f59e0b' },
      info: { color: '#3b82f6' },
    },
  },
});

globalStyle(`${iconWrap.classNames.base} svg`, {
  fontSize: '1.25rem',
});

export const descriptionRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['4'],
});

export const description = style({
  margin: '0',
  fontSize: '0.9375rem',
  color: '#374151',
  lineHeight: '1.5',
});

export const countBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  background: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '0.5rem 0.875rem',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '1.25rem',
});

export const formGroup = style({
  marginTop: '1.25rem',
});

export const resultBanner = recipe({
  base: {
    borderRadius: '8px',
    padding: '0.875rem 1rem',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  variants: {
    hasFailures: {
      true: { background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' },
      false: { background: '#d1fae5', border: '1px solid #6ee7b7', color: '#065f46' },
    },
  },
});

export const resultIcon = style({
  marginRight: '0.375rem',
  verticalAlign: 'middle',
});

export const failureGuidance = style({
  margin: '0',
  fontSize: '0.8125rem',
  color: '#6b7280',
  lineHeight: '1.5',
});

export const failedIdsSection = style({
  marginTop: '0.75rem',
});

export const failedIdsList = style({
  listStyle: 'none',
  margin: '0.5rem 0 0',
  padding: '0.5rem 0.75rem',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  maxHeight: '120px',
  overflowY: 'auto',
  fontSize: '0.8125rem',
  fontFamily: 'monospace',
  color: '#374151',
});

export const failedIdItem = style({
  padding: '0.125rem 0',
});
