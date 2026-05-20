import { style } from '@vanilla-extract/css';

export const container = style({
  padding: '1.5rem',
  display: 'grid',
  gap: '1.5rem',
  maxWidth: '48rem',
});

export const fieldGroup = style({
  display: 'grid',
  gap: '0.5rem',
});

export const fieldGroupSpaced = style({
  display: 'grid',
  gap: '0.5rem',
  marginTop: '0.5rem',
});

export const section = style({
  borderTop: '1px solid #e5e7eb',
  paddingTop: '1rem',
});

export const buttonIcon = style({
  marginRight: '0.5rem',
});

export const deleteButton = style({
  marginTop: '0.5rem',
});

export const message = style({
  padding: '0.75rem',
  borderRadius: '0.375rem',
});

export const messageSuccess = style({
  background: '#dcfce7',
  color: '#166534',
});

export const messageError = style({
  background: '#fee2e2',
  color: '#991b1b',
});
