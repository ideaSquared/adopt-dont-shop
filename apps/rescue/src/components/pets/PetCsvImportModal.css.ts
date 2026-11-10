import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const stepContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  minHeight: '300px',
});

export const stepHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing['3'],
  paddingBottom: '0.75rem',
  borderBottom: '1px solid #e5e7eb',
});

export const steps = style({
  display: 'flex',
  gap: vars.spacing['2'],
  fontSize: '0.85rem',
  color: '#6b7280',
});

export const stepActive = style({
  color: '#2563eb',
  fontWeight: vars.typography.weight.semibold,
});

export const dropZone = style({
  border: '2px dashed #d1d5db',
  borderRadius: vars.border.radius.base,
  padding: '2.5rem',
  textAlign: 'center',
  cursor: 'pointer',
  background: '#f9fafb',
});

export const mappingGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: `${vars.spacing['2']} ${vars.spacing['3']}`,
  alignItems: 'center',
});

export const fieldLabel = style({
  fontWeight: vars.typography.weight.medium,
  fontSize: vars.typography.size.sm,
});

export const requiredMark = style({
  color: '#dc2626',
  marginLeft: vars.spacing['1'],
});

export const select = style({
  padding: '0.4rem 0.5rem',
  borderRadius: '0.375rem',
  border: '1px solid #d1d5db',
  width: '100%',
});

export const errorList = style({
  margin: 0,
  paddingLeft: '1.25rem',
  color: '#b91c1c',
  fontSize: '0.8rem',
});

export const summary = style({
  display: 'flex',
  gap: vars.spacing['4'],
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
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.bold,
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

export const helpText = style({
  fontSize: '0.85rem',
  color: '#6b7280',
});

export const hiddenInput = style({
  display: 'none',
});

export const stepDescription = style({
  margin: 0,
  fontSize: '0.9rem',
  color: '#374151',
});

export const scrollableTable = style({
  maxHeight: '320px',
  overflow: 'auto',
});

export const importingMessage = style({
  padding: vars.spacing['5'],
  textAlign: 'center',
});

export const failureTable = style({
  maxHeight: '240px',
  overflow: 'auto',
});
