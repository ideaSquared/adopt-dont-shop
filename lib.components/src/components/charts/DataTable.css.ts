import { style } from '@vanilla-extract/css';

export const scrollContainer = style({
  height: '100%',
  overflow: 'auto',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
});

export const th = style({
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-border, #e5e7eb)',
  cursor: 'pointer',
  color: 'var(--color-text-muted, #6b7280)',
  fontWeight: 600,
  background: 'var(--color-surface-muted, #f9fafb)',
  position: 'sticky',
  top: 0,
});

export const td = style({
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-border, #e5e7eb)',
  color: 'var(--color-text, #111827)',
});

export const rowClickable = style({
  cursor: 'pointer',
});

export const rowDefault = style({
  cursor: 'default',
});

export const pagination = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  fontSize: '12px',
  color: 'var(--color-text-muted, #6b7280)',
  paddingTop: '8px',
});
