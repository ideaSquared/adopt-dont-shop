import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const overlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
  padding: '1rem',
});

export const modal = style({
  background: '#ffffff',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '480px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
});

export const modalHeader = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    borderRadius: '16px 16px 0 0',
  },
  variants: {
    variant: {
      danger: { background: '#fee2e2' },
      warning: { background: '#fef3c7' },
      info: { background: '#dbeafe' },
    },
  },
});

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
    selectors: {
      '& svg': {
        fontSize: '1.25rem',
      },
    },
  },
  variants: {
    variant: {
      danger: { color: '#ef4444' },
      warning: { color: '#f59e0b' },
      info: { color: '#3b82f6' },
    },
  },
});

export const headerText = style({
  flex: 1,
});

export const modalTitle = style({
  margin: '0',
  fontSize: '1rem',
  fontWeight: '700',
  color: '#111827',
});

export const closeBtn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  background: 'none',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#6b7280',
  ':hover': {
    background: 'rgba(0, 0, 0, 0.1)',
  },
});

export const modalBody = style({
  padding: '1.5rem',
});

export const description = style({
  margin: '0 0 1rem 0',
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

export const label = style({
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '0.5rem',
});

export const textArea = style({
  width: '100%',
  minHeight: '80px',
  padding: '0.625rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  color: '#111827',
  resize: 'vertical',
  boxSizing: 'border-box',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
    boxShadow: `0 0 0 3px ${vars.colors.primary['100']}`,
  },
  '::placeholder': {
    color: '#9ca3af',
  },
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

export const modalFooter = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  padding: '1.25rem 1.5rem',
  borderTop: '1px solid #e5e7eb',
});
