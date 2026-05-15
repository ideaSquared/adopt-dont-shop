import { style } from '@vanilla-extract/css';

export const stepContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  minHeight: '300px',
});

export const stepHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid #e5e7eb',
});

export const steps = style({
  display: 'flex',
  gap: '0.5rem',
  fontSize: '0.85rem',
  color: '#6b7280',
});

export const stepActive = style({
  color: '#2563eb',
  fontWeight: 600,
});

export const dropZone = style({
  border: '2px dashed #d1d5db',
  borderRadius: '0.5rem',
  padding: '2.5rem',
  textAlign: 'center',
  cursor: 'pointer',
  background: '#f9fafb',
});

export const mappingGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.5rem 1rem',
  alignItems: 'center',
});

export const fieldLabel = style({
  fontWeight: 500,
  fontSize: '0.875rem',
});

export const requiredMark = style({
  color: '#dc2626',
  marginLeft: '0.25rem',
});

export const select = style({
  padding: '0.4rem 0.5rem',
  borderRadius: '0.375rem',
  border: '1px solid #d1d5db',
  width: '100%',
});

export const previewTable = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.85rem',
});

export const previewCell = style({
  border: '1px solid #e5e7eb',
  padding: '0.4rem 0.5rem',
  verticalAlign: 'top',
});

export const rowOk = style({
  background: '#f0fdf4',
});

export const rowError = style({
  background: '#fef2f2',
});

export const errorList = style({
  margin: 0,
  paddingLeft: '1.25rem',
  color: '#b91c1c',
  fontSize: '0.8rem',
});

export const summary = style({
  display: 'flex',
  gap: '1.5rem',
  padding: '0.75rem',
  background: '#f3f4f6',
  borderRadius: '0.375rem',
});

export const summaryItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
});

export const summaryNumber = style({
  fontSize: '1.25rem',
  fontWeight: 700,
});

export const actionsRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.75rem',
  paddingTop: '0.75rem',
  borderTop: '1px solid #e5e7eb',
});

export const warning = style({
  padding: '0.6rem 0.75rem',
  background: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '0.375rem',
  fontSize: '0.85rem',
  color: '#92400e',
});
