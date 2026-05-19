import { style } from '@vanilla-extract/css';

export const pageContainer = style({
  padding: '1.5rem',
});

export const pageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
});

export const errorBanner = style({
  background: '#fee2e2',
  color: '#991b1b',
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
  borderBottom: '1px solid #e5e7eb',
  textAlign: 'left',
});

export const tableCell = style({
  padding: '0.5rem',
});

export const monoCell = style({
  padding: '0.5rem',
  fontFamily: 'monospace',
});

export const tableBodyRow = style({
  borderBottom: '1px solid #f3f4f6',
});

export const modalOverlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
});

export const modalForm = style({
  background: 'white',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  minWidth: '24rem',
  display: 'grid',
  gap: '0.5rem',
});

export const modalActions = style({
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
});
