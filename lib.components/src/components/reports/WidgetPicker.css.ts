import { style } from '@vanilla-extract/css';

export const overlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
});

export const panel = style({
  background: 'var(--color-surface, #fff)',
  borderRadius: '12px',
  padding: '20px',
  width: 'min(640px, 90vw)',
  maxHeight: '80vh',
  overflowY: 'auto',
});

export const heading = style({
  marginTop: 0,
});

export const presetGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '8px',
});

export const presetButton = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
  padding: '12px',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '8px',
  background: 'var(--color-surface, #fff)',
  cursor: 'pointer',
  width: '100%',
});

export const presetLabel = style({
  fontSize: '13px',
});

export const presetDescription = style({
  fontSize: '12px',
  color: 'var(--color-text-muted, #6b7280)',
  marginTop: '4px',
});

export const footer = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  marginTop: '16px',
});
