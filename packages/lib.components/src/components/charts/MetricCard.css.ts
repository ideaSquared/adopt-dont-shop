import { style } from '@vanilla-extract/css';

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '8px',
  padding: '16px',
  height: '100%',
  minHeight: '110px',
  boxSizing: 'border-box',
});

export const label = style({
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-muted, #6b7280)',
  margin: 0,
});

export const value = style({
  fontSize: '28px',
  fontWeight: 700,
  color: 'var(--color-text, #111827)',
  margin: '4px 0',
});

export const delta = style({
  fontSize: '12px',
  fontWeight: 600,
});

export const helper = style({
  fontSize: '12px',
  color: 'var(--color-text-muted, #6b7280)',
});
