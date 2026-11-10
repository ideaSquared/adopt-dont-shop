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
  width: 'min(720px, 92vw)',
  maxHeight: '85vh',
  overflowY: 'auto',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
});

export const title = style({
  margin: 0,
});
