import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  background: '#f3f4f6',
  borderRadius: '0.375rem',
  marginBottom: '0.75rem',
  flexWrap: 'wrap',
});

export const spacer = style({
  flex: 1,
});

export const approveButton = style({
  background: '#16a34a',
  color: 'white',
  padding: '0.25rem 0.75rem',
});

export const rejectButton = style({
  background: '#dc2626',
  color: 'white',
  padding: '0.25rem 0.75rem',
});

export const neutralButton = style({
  padding: '0.25rem 0.75rem',
});

export const fullWidthRow = style({
  width: '100%',
});

export const confirmRow = style({
  width: '100%',
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  paddingTop: '0.5rem',
  borderTop: '1px solid #d1d5db',
  marginTop: '0.5rem',
  flexWrap: 'wrap',
});

export const reasonInput = style({
  flex: 1,
  minWidth: '12rem',
  padding: '0.25rem 0.5rem',
});
