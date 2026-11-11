import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

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
  background: vars.background.surface,
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
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: '8px',
  background: vars.background.surface,
  cursor: 'pointer',
  width: '100%',
});

export const presetLabel = style({
  fontSize: '13px',
});

export const presetDescription = style({
  fontSize: '12px',
  color: vars.text.tertiary,
  marginTop: '4px',
});

export const footer = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  marginTop: '16px',
});
