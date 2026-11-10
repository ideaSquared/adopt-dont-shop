import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: vars.background.surface,
});

export const pageHeader = style({
  padding: `${vars.spacing['4']} ${vars.spacing['5']}`,
  background: vars.background.surface,
  borderBottom: `1px solid ${vars.border.color.default}`,
  '@media': {
    'screen and (max-width: 768px)': {
      padding: '1rem 1.25rem',
    },
  },
});

globalStyle(`${pageHeader} h1`, {
  margin: 0,
  fontSize: vars.typography.size['3xl'],
  fontWeight: vars.typography.weight.bold,
  color: vars.text.primary,
  letterSpacing: '-0.025em',
});

globalStyle(`${pageHeader} p`, {
  margin: `${vars.spacing['2']} 0 0 0`,
  color: vars.text.tertiary,
  fontSize: vars.typography.size.base,
});

// The tab panel around this has no fixed height, so the chat panel sizes itself to the
// viewport (page header + tabs take roughly 15rem) instead of collapsing and leaving a blank
// area below it.
export const chatContainer = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(300px, 380px) 1fr',
  height: 'calc(100dvh - 15rem)',
  minHeight: '28rem',
  overflow: 'hidden',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  '@media': {
    'screen and (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const mobileView = style({
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'grid',
      gridTemplateColumns: '1fr',
      height: '100%',
    },
  },
});

export const mobileViewShowChat = style({});

globalStyle(`${mobileViewShowChat} > :first-child`, {
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'none',
    },
  },
});

globalStyle(`${mobileViewShowChat} > :last-child`, {
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'flex',
    },
  },
});

export const mobileViewHideChat = style({});

globalStyle(`${mobileViewHideChat} > :first-child`, {
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'flex',
    },
  },
});

globalStyle(`${mobileViewHideChat} > :last-child`, {
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'none',
    },
  },
});

export const loadingContainer = style({
  flex: 1,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  background: vars.background.surface,
});
