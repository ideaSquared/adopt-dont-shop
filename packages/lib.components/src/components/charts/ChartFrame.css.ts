import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const frame = style({
  display: 'flex',
  flexDirection: 'column',
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.muted}`,
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
  color: vars.text.primary,
  margin: 0,
});

export const subtitle = style({
  fontSize: '12px',
  color: vars.text.tertiary,
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
  color: vars.text.tertiary,
  fontSize: '13px',
});

export const stateError = style({
  color: vars.colors.danger,
});
