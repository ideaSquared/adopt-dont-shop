import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: vars.spacing['5'],
});

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const notificationItem = recipe({
  base: {
    display: 'block',
    width: '100%',
    minHeight: '5.5rem',
    textAlign: 'left',
    font: 'inherit',
    color: vars.text.primary,
    background: vars.background.surface,
    border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
    borderRadius: vars.border.radius.lg,
    padding: 0,
    cursor: 'pointer',
    transition: `background ${vars.transitions.fast}, box-shadow ${vars.transitions.fast}`,
    selectors: {
      '&:hover': {
        background: vars.background.muted,
        boxShadow: vars.shadows.sm,
      },
      '&:focus-visible': {
        outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
        outlineOffset: '2px',
      },
    },
  },
  variants: {
    isRead: {
      true: {
        borderLeft: `4px solid transparent`,
      },
      false: {
        borderLeft: `4px solid ${vars.colors.primary}`,
        background: vars.colors.primaryBgSubtle,
      },
    },
  },
});

export const notificationContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
  padding: vars.spacing['3'],
});

export const title = style({
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

// Two lines at most, so every row stays a similar height however long the message is.
export const message = style({
  color: vars.text.secondary,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
});

export const timestamp = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
});

export const srOnly = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
});

export const loadingList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const loadMore = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: vars.spacing['4'],
});
