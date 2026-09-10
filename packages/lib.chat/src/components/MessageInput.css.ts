import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const inputContainer = style({
  padding: '0.75rem 1rem 1.25rem 1rem',
  background: vars.background.body,
});

export const inputRow = style({
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-end',
});

export const messageTextAreaWrapper = style({
  flex: '1',
  width: '100%',
  minWidth: '0',
});

export const sendButton = style({
  minWidth: '44px',
  height: '44px',
  borderRadius: '50%',
  padding: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  border: 'none',
  background: vars.colors.primary,
  color: 'white',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
  cursor: 'pointer',
  selectors: {
    '&:enabled:hover': {
      transform: 'scale(1.05)',
    },
    '&:enabled:active': {
      transform: 'scale(0.95)',
    },
    '&:disabled': {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
  },
});

export const inputFooter = style({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '0.5rem',
  fontSize: '0.875rem',
  color: '#666',
});

export const charCountWarning = style({
  color: '#ef4444',
});

// TextArea overrides — can't use className on the lib.components TextArea directly
// but we wrap it; globalStyle targets the textarea element inside the wrapper
globalStyle(`${messageTextAreaWrapper} textarea`, {
  width: '100%',
  minWidth: '0',
  minHeight: '44px',
  maxHeight: '120px',
  resize: 'none',
  borderRadius: '22px',
  padding: '0.75rem 1rem',
  fontSize: '0.95rem',
  lineHeight: '1.4',
  background: vars.background.surface,
  border: 'none',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease',
  overflowY: 'auto',
  wordWrap: 'break-word',
  whiteSpace: 'pre-wrap',
});

globalStyle(`${messageTextAreaWrapper} textarea:focus`, {
  outline: 'none',
  background: vars.background.body,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  transform: 'translateY(-1px)',
});

globalStyle(`${messageTextAreaWrapper} textarea::placeholder`, {
  color: vars.text.secondary,
});
