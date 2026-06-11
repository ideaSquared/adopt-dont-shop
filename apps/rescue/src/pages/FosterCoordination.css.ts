import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: '1.5rem',
});

export const pageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
});

export const errorBanner = style({
  background: vars.background.danger,
  color: vars.text.danger,
  padding: '0.75rem',
  margin: '1rem 0',
});

export const filterRow = style({
  margin: '1rem 0',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
});

export const tableHeadRow = style({
  borderBottom: `1px solid ${vars.border.color.default}`,
  textAlign: 'left',
});

export const tableCell = style({
  padding: '0.5rem',
});

export const tableBodyRow = style({
  borderBottom: `1px solid ${vars.background.muted}`,
});

export const modalForm = style({
  display: 'grid',
  gap: '0.5rem',
});

export const modalActions = style({
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
});
