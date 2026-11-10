import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  padding: vars.spacing['4'],
});

export const section = style({
  padding: vars.spacing['3'],
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  background: '#fff',
});

export const reportList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  marginTop: '12px',
});

export const reportRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '12px',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  textDecoration: 'none',
  color: 'inherit',
});

export const updatedMeta = style({
  color: '#6b7280',
  fontSize: vars.typography.size.xs,
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
  borderRadius: vars.border.radius.base,
  textDecoration: 'none',
  color: 'inherit',
});

export const templateMeta = style({
  color: '#6b7280',
  fontSize: vars.typography.size.xs,
  marginTop: vars.spacing['1'],
});
