import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const section = style({
  padding: '16px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  background: '#fff',
});

export const reportList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '12px',
});

export const reportRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '12px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  textDecoration: 'none',
  color: 'inherit',
});

export const updatedMeta = style({
  color: '#6b7280',
  fontSize: '12px',
});

export const templateGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '12px',
  marginTop: '12px',
});

export const templateCard = style({
  display: 'block',
  padding: '12px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  textDecoration: 'none',
  color: 'inherit',
});

export const templateMeta = style({
  color: '#6b7280',
  fontSize: '12px',
  marginTop: '4px',
});
