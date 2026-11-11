import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: '8px',
  padding: '16px',
  height: '100%',
  minHeight: '110px',
  boxSizing: 'border-box',
});

export const icon = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  fontSize: '20px',
  marginBottom: '8px',
  color: vars.text.tertiary,
  background: vars.background.muted,
});

export const label = style({
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: vars.text.tertiary,
  margin: 0,
});

export const value = style({
  fontSize: '28px',
  fontWeight: 700,
  color: vars.text.primary,
  margin: '4px 0',
});

export const delta = style({
  fontSize: '12px',
  fontWeight: 600,
});

export const helper = style({
  fontSize: '12px',
  color: vars.text.tertiary,
});
