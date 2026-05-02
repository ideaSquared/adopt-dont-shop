import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const modalContent = style({
  padding: '1.5rem',
  maxWidth: '500px',
});

export const title = style({
  color: vars.colors.neutral['900'],
  marginBottom: '1rem',
  fontSize: '1.5rem',
});

export const description = style({
  color: vars.colors.neutral['700'],
  marginBottom: '1.5rem',
  lineHeight: 1.6,
});

export const reasonSection = style({
  marginBottom: '1.5rem',
});

export const label = style({
  display: 'block',
  fontWeight: 500,
  color: vars.colors.neutral['900'],
  marginBottom: '0.5rem',
});

export const textArea = style({
  width: '100%',
  minHeight: '100px',
  padding: '0.75rem',
  border: `1px solid ${vars.colors.neutral['300']}`,
  borderRadius: '0.5rem',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  resize: 'vertical',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
    boxShadow: `0 0 0 3px ${vars.colors.primary['100']}`,
  },
});

export const actionButtons = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
});

export const warningText = style({
  marginBottom: '1.5rem',
});
