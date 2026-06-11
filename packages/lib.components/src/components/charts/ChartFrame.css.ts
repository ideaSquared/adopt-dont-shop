import { style } from '@vanilla-extract/css';

export const frame = style({
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '8px',
  padding: '16px',
  height: '100%',
  minHeight: '220px',
  boxSizing: 'border-box',
});

export const header = style({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '8px',
  marginBottom: '12px',
});

export const title = style({
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text, #111827)',
  margin: 0,
});

export const subtitle = style({
  fontSize: '12px',
  color: 'var(--color-text-muted, #6b7280)',
  marginTop: '2px',
});

export const body = style({
  flex: 1,
  position: 'relative',
  minHeight: 0,
});

export const state = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted, #6b7280)',
  fontSize: '13px',
});

export const stateError = style({
  color: 'var(--color-danger, #dc2626)',
});
