import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const chatContainer = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  maxWidth: '100%',
  margin: '0 auto',
  background: vars.background.body,
  overflow: 'hidden',
  '@media': {
    '(max-width: 768px)': {
      // Subtract the 56px sticky navbar and the 56px space the shell reserves
      // for the fixed BottomTabBar so the message composer stays on-screen and
      // isn't hidden behind the bottom nav.
      height: 'calc(100vh - 112px)',
    },
  },
});

export const chatLayout = style({
  flex: '1 1 0%',
  display: 'flex',
  minHeight: 0,
  background: vars.background.surface,
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  border: `1px solid ${vars.border.color.muted}`,
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      borderRadius: 0,
      border: 'none',
      boxShadow: 'none',
    },
  },
});

export const divider = style({
  width: '1px',
  background: vars.border.color.muted,
  opacity: 0.5,
  '@media': {
    '(max-width: 768px)': {
      display: 'none',
    },
  },
});

export const mobileConversationView = style({
  display: 'none',
  '@media': {
    '(max-width: 768px)': {
      display: 'block',
      height: '100%',
      width: '100vw',
      background: vars.background.body,
    },
  },
});

export const desktopView = style({
  display: 'flex',
  flex: '1 1 0%',
  minWidth: 0,
  '@media': {
    '(max-width: 768px)': {
      display: 'none',
    },
  },
});

export const conversationPanel = style({
  width: '320px',
  minWidth: '260px',
  maxWidth: '380px',
  flexShrink: 0,
  background: vars.background.body,
  borderRight: `1px solid ${vars.border.color.muted}`,
  height: '100%',
  overflowY: 'auto',
  zIndex: 1,
  '@media': {
    '(max-width: 1024px)': {
      width: '240px',
      minWidth: '180px',
    },
    '(max-width: 768px)': {
      width: '100vw',
      minWidth: 0,
      borderRight: 'none',
      borderBottom: `1px solid ${vars.border.color.muted}`,
    },
  },
});

export const header = style({
  padding: '1.5rem 2rem 1rem 2rem',
  background: vars.background.body,
  borderBottom: `1px solid ${vars.border.color.muted}`,
  '@media': {
    '(max-width: 768px)': {
      padding: '1.25rem 1rem 0.875rem 1rem',
    },
  },
});

globalStyle(`${header} h1`, {
  margin: '0 0 0.25rem 0',
  fontSize: '1.75rem',
  fontWeight: 800,
  color: vars.text.primary,
  letterSpacing: '-0.025em',
});

globalStyle(`${header} p`, {
  margin: 0,
  fontSize: '1rem',
  color: vars.text.secondary,
  lineHeight: 1.4,
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '300px',
  background: vars.background.surface,
});

export const errorMessage = style({
  background: vars.colors.dangerBgSubtle,
  color: vars.colors.dangerTextEmphasis,
  border: `1px solid ${vars.colors.dangerBorderSubtle}`,
  padding: '1.5rem',
  borderRadius: '8px',
  margin: '2rem auto',
  textAlign: 'center',
  maxWidth: '400px',
  fontSize: '1.1rem',
});

export const loginPrompt = style({
  textAlign: 'center',
  padding: '4rem 2rem',
  background: vars.background.surface,
  borderRadius: '12px',
  margin: '2rem 0',
});

globalStyle(`${loginPrompt} h2`, {
  fontSize: '1.8rem',
  color: vars.text.primary,
  marginBottom: '1rem',
});

globalStyle(`${loginPrompt} p`, {
  fontSize: '1.1rem',
  color: vars.text.secondary,
  marginBottom: '2rem',
  lineHeight: 1.6,
});

export const ctaButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.875rem 2rem',
  background: vars.colors.primaryHover,
  color: 'white',
  textDecoration: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '1rem',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.colors.primaryActive,
    transform: 'translateY(-1px)',
  },
});
