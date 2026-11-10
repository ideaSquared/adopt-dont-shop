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
  borderRadius: vars.border.radius.lg,
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
  padding: `${vars.spacing['4']} ${vars.spacing['5']} ${vars.spacing['3']} ${vars.spacing['5']}`,
  background: vars.background.body,
  borderBottom: `1px solid ${vars.border.color.muted}`,
  '@media': {
    '(max-width: 768px)': {
      padding: '1.25rem 1rem 0.875rem 1rem',
    },
  },
});

globalStyle(`${header} h1`, {
  margin: `0 0 ${vars.spacing['1']} 0`,
  fontSize: '1.75rem',
  fontWeight: 800,
  color: vars.text.primary,
  letterSpacing: '-0.025em',
});

globalStyle(`${header} p`, {
  margin: 0,
  fontSize: vars.typography.size.base,
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
  padding: vars.spacing['4'],
  borderRadius: vars.border.radius.base,
  margin: `${vars.spacing['5']} auto`,
  textAlign: 'center',
  maxWidth: '400px',
  fontSize: '1.1rem',
});

export const loginPrompt = style({
  textAlign: 'center',
  padding: `${vars.spacing['7']} ${vars.spacing['5']}`,
  background: vars.background.surface,
  borderRadius: vars.border.radius.lg,
  margin: `${vars.spacing['5']} 0`,
});

globalStyle(`${loginPrompt} h2`, {
  fontSize: '1.8rem',
  color: vars.text.primary,
  marginBottom: vars.spacing['3'],
});

globalStyle(`${loginPrompt} p`, {
  fontSize: '1.1rem',
  color: vars.text.secondary,
  marginBottom: vars.spacing['5'],
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
  borderRadius: vars.border.radius.base,
  fontWeight: vars.typography.weight.semibold,
  fontSize: vars.typography.size.base,
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.colors.primaryActive,
    transform: 'translateY(-1px)',
  },
});
