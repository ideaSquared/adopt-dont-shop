import { globalStyle, keyframes, style, styleVariants } from '@vanilla-extract/css';
import { vars } from '../../../lib.components/src/styles/theme.css';

export const conversationContainer = style({
  background: vars.background.primary,
  borderRight: `1px solid ${vars.border.color.secondary}`,
  height: '100%',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  '@media': {
    '(max-width: 768px)': {
      borderRight: 'none',
      borderBottom: `1px solid ${vars.border.color.secondary}`,
    },
  },
});

export const header = style({
  padding: '1.5rem 1.25rem 1rem 1.25rem',
  borderBottom: `1px solid ${vars.border.color.tertiary}`,
  background: vars.background.primary,
  position: 'sticky',
  top: '0',
  zIndex: '10',
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '0.5rem',
});

globalStyle(`${header} h3`, {
  margin: '0',
  fontSize: '1.35rem',
  fontWeight: '700',
  color: vars.text.primary,
  letterSpacing: '-0.02em',
});

export const headerCount = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  fontWeight: '500',
  fontVariantNumeric: 'tabular-nums',
});

export const conversationsList = style({
  flex: '1',
  overflowY: 'auto',
  padding: '0.5rem 0',
});

const conversationItemBase = style({
  display: 'flex',
  gap: '0.75rem',
  width: '100%',
  textAlign: 'left',
  padding: '0.75rem 1rem',
  cursor: 'pointer',
  transition: 'background 0.12s ease, transform 0.12s ease',
  border: 'none',
  borderBottom: `1px solid ${vars.border.color.tertiary}`,
  color: 'inherit',
  font: 'inherit',
  position: 'relative',
});

export const conversationItem = styleVariants({
  default: [
    conversationItemBase,
    {
      background: 'transparent',
      borderLeft: '3px solid transparent',
      selectors: {
        '&:hover': {
          background: vars.background.secondary,
        },
        '&:focus-visible': {
          outline: `2px solid ${vars.colors.primary['500']}`,
          outlineOffset: '-2px',
        },
      },
    },
  ],
  active: [
    conversationItemBase,
    {
      background: vars.colors.primary['50'],
      borderLeft: `3px solid ${vars.colors.primary['500']}`,
      selectors: {
        '&:hover': {
          background: vars.colors.primary['100'],
        },
        '&:focus-visible': {
          outline: `2px solid ${vars.colors.primary['500']}`,
          outlineOffset: '-2px',
        },
      },
    },
  ],
  unread: [
    conversationItemBase,
    {
      background: vars.background.secondary,
      borderLeft: '3px solid transparent',
      selectors: {
        '&:hover': {
          background: vars.background.secondary,
        },
        '&:focus-visible': {
          outline: `2px solid ${vars.colors.primary['500']}`,
          outlineOffset: '-2px',
        },
      },
    },
  ],
});

export const conversationBody = style({
  flex: '1',
  minWidth: '0',
});

export const conversationHeaderRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.25rem',
});

export const avatar = style({
  flex: '0 0 auto',
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1rem',
  fontWeight: '700',
  color: vars.colors.primary['700'],
  background: `linear-gradient(135deg, ${vars.colors.primary['100']}, ${vars.colors.primary['200']})`,
  boxShadow: `inset 0 0 0 2px ${vars.background.primary}`,
  position: 'relative',
});

export const avatarWithUnread = style({
  flex: '0 0 auto',
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1rem',
  fontWeight: '700',
  color: vars.colors.primary['700'],
  background: `linear-gradient(135deg, ${vars.colors.primary['100']}, ${vars.colors.primary['200']})`,
  boxShadow: `inset 0 0 0 2px ${vars.background.primary}`,
  position: 'relative',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '-2px',
      right: '-2px',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      background: vars.colors.semantic.error['500'],
      boxShadow: `0 0 0 2px ${vars.background.primary}`,
    },
  },
});

export const rescueName = style({
  margin: '0',
  fontSize: '0.95rem',
  fontWeight: '600',
  color: vars.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: '0',
  flex: '1',
});

export const rescueNameUnread = style({
  margin: '0',
  fontSize: '0.95rem',
  fontWeight: '700',
  color: vars.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: '0',
  flex: '1',
});

export const timestamp = style({
  fontSize: '0.75rem',
  color: vars.text.tertiary,
  fontWeight: '500',
  flex: '0 0 auto',
  fontVariantNumeric: 'tabular-nums',
});

export const timestampUnread = style({
  fontSize: '0.75rem',
  color: vars.colors.primary['600'],
  fontWeight: '600',
  flex: '0 0 auto',
  fontVariantNumeric: 'tabular-nums',
});

export const lastMessage = style({
  margin: '0',
  fontSize: '0.8125rem',
  color: vars.text.secondary,
  fontWeight: '400',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: '1.4',
});

export const lastMessageUnread = style({
  margin: '0',
  fontSize: '0.8125rem',
  color: vars.text.primary,
  fontWeight: '500',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: '1.4',
});

export const petInfo = style({
  fontSize: '0.6875rem',
  color: vars.colors.primary['600'],
  marginTop: '0.375rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

const badgePulse = keyframes({
  '0%': { boxShadow: '0 0 0 0 color-mix(in srgb, var(--chat-unread-halo) 55%, transparent)' },
  '70%': { boxShadow: '0 0 0 6px transparent' },
  '100%': { boxShadow: '0 0 0 0 transparent' },
});

export const unreadBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '22px',
  height: '22px',
  padding: '0 7px',
  borderRadius: '11px',
  background: vars.colors.semantic.error['500'],
  color: vars.text.inverse,
  fontSize: '0.75rem',
  fontWeight: '700',
  lineHeight: '1',
  flex: '0 0 auto',
  animationName: badgePulse,
  animationDuration: '2s',
  animationTimingFunction: 'ease-out',
  animationIterationCount: 'infinite',
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
  },
});

export const bottomRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
});

export const emptyState = style({
  padding: '3.5rem 2rem',
  textAlign: 'center',
  color: vars.text.secondary,
});

globalStyle(`${emptyState} h4`, {
  margin: '0 0 0.5rem 0',
  color: vars.text.primary,
  fontSize: '1.1rem',
  fontWeight: '700',
  letterSpacing: '-0.01em',
});

globalStyle(`${emptyState} p`, {
  margin: '0 0 1.5rem 0',
  fontSize: '0.9rem',
  lineHeight: '1.55',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '200px',
});
