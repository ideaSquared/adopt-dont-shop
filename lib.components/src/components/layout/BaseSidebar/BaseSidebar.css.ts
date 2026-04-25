import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const sidebarContainer = style({
  position: 'fixed',
  top: 0,
  right: 0,
  height: '100%',
  backgroundColor: vars.background.primary,
  boxShadow: '-2px 0 5px rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.3s ease-in-out',
  zIndex: vars.zIndex.modal,
  display: 'flex',
  flexDirection: 'column',
});

export const sidebarHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px',
  borderBottom: `1px solid ${vars.border.color.primary}`,
});

export const sidebarTitle = style({
  margin: 0,
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.medium,
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  fontSize: vars.typography.size['2xl'],
  color: vars.text.primary,
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      color: vars.text.primary,
    },
  },
});

export const sidebarContent = style({
  padding: '16px',
  overflowY: 'auto',
  flexGrow: 1,
});
