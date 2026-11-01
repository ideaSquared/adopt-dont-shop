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

export const tabs = style({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  selectors: {
    '& > [role="tablist"]': {
      padding: '0 1.25rem',
      marginBottom: 0,
      overflowX: 'auto',
    },
    '& > [role="tabpanel"]': {
      flex: 1,
      overflowY: 'auto',
      padding: '1.25rem',
    },
  },
});
