import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
});

export const headerRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  padding: '12px',
  background: '#f9fafb',
  borderRadius: '8px',
});

export const fieldLabel = style({
  fontSize: '12px',
  color: '#6b7280',
});

export const textInput = style({
  width: '100%',
  padding: '8px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
});
