import { style } from '@vanilla-extract/css';
import { vars } from '../../../styles/theme.css';

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '12px',
  overflow: 'hidden',
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '1rem 1.25rem',
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const headerSlot = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const closeButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  border: 'none',
  borderRadius: '6px',
  background: 'transparent',
  color: vars.text.tertiary,
  cursor: 'pointer',
  flexShrink: 0,
  fontSize: '1rem',
  ':hover': {
    background: vars.background.muted,
    color: vars.text.primary,
  },
});

export const tabBar = style({
  display: 'flex',
  gap: 0,
  borderBottom: `1px solid ${vars.border.color.default}`,
  padding: '0 1.25rem',
  overflowX: 'auto',
});

export const tab = style({
  padding: '0.625rem 1rem',
  border: 'none',
  borderBottom: '2px solid transparent',
  background: 'transparent',
  color: vars.text.tertiary,
  fontSize: '0.8125rem',
  fontWeight: '500',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
  ':hover': {
    color: vars.text.primary,
  },
});

export const tabActive = style({
  color: vars.colors.primary,
  borderBottomColor: vars.colors.primary,
});

export const tabContent = style({
  flex: 1,
  overflowY: 'auto',
  padding: '1.25rem',
});
