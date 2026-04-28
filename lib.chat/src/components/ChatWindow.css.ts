import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components';

export const chatContainer = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  flex: '1',
  minWidth: '0',
  background: vars.background.primary,
  borderRadius: '0',
  overflow: 'hidden',
});

export const chatHeader = style({
  padding: '1rem 1.25rem',
  borderBottom: `1px solid ${vars.border.color.secondary}`,
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  background: vars.background.secondary,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  minHeight: '64px',
  '@media': {
    '(max-width: 768px)': {
      padding: '0.875rem 1rem',
      minHeight: '56px',
    },
  },
});

export const backButton = style({
  '@media': {
    '(min-width: 769px)': {
      display: 'none',
    },
  },
  minWidth: '40px',
  height: '40px',
  borderRadius: '50%',
  padding: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const headerAvatar = style({
  flex: '0 0 auto',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.9rem',
  fontWeight: '700',
  color: vars.colors.primary['700'],
  background: `linear-gradient(135deg, ${vars.colors.primary['100']}, ${vars.colors.primary['200']})`,
  boxShadow: `inset 0 0 0 2px ${vars.background.primary}`,
});

export const conversationInfo = style({
  flex: '1',
  minWidth: '0',
});

globalStyle(`${conversationInfo} h3`, {
  margin: '0',
  fontSize: '1.05rem',
  color: vars.text.primary,
  fontWeight: '700',
  letterSpacing: '-0.01em',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: '1.2',
});

globalStyle(`${conversationInfo} p`, {
  margin: '0.125rem 0 0 0',
  fontSize: '0.8125rem',
  color: vars.text.secondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontWeight: '500',
});

export const chatBody = style({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '0',
  position: 'relative',
  background: vars.background.primary,
});

export const emptyState = style({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '3rem 1.5rem',
  textAlign: 'center',
  color: vars.text.secondary,
});

globalStyle(`${emptyState} h3`, {
  margin: '0',
  color: vars.text.primary,
  fontSize: '1.2rem',
  fontWeight: '700',
  letterSpacing: '-0.01em',
});

globalStyle(`${emptyState} p`, {
  margin: '0',
  fontSize: '0.95rem',
  maxWidth: '24rem',
  lineHeight: '1.5',
});

export const loadingContainer = style({
  flex: '1',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  background: vars.background.secondary,
});

export const errorMessage = style({
  margin: '1.5rem',
  padding: '1.25rem',
  background: vars.colors.semantic.error['100'],
  border: `1px solid ${vars.colors.semantic.error['600']}`,
  color: vars.colors.semantic.error['500'],
  borderRadius: vars.border.radius.md,
  textAlign: 'center',
  fontSize: '1.05rem',
});

export const messagesContainer = style({
  flex: '1 1 auto',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '0',
  background: vars.background.primary,
});

export const typingContainerWrap = style({
  padding: '0.5rem 1rem',
});

export const inputArea = style({
  flex: '0 0 auto',
  background: vars.background.primary,
});
