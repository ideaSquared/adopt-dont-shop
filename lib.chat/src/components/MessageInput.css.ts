import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const inputContainer = style({
  padding: '0.75rem 1rem 1.25rem 1rem',
  background: vars.background.primary,
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

export const attachmentPreview = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginBottom: '0.75rem',
});

export const attachmentItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  background: vars.colors.primary['100'],
  border: `1px solid ${vars.colors.primary['500']}`,
  borderRadius: '18px',
  fontSize: '0.875rem',
});

export const attachmentName = style({
  color: vars.text.primary,
  maxWidth: '150px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontWeight: '500',
});

export const removeButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '18px',
  height: '18px',
  border: 'none',
  background: vars.colors.semantic.error['500'],
  color: 'white',
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: '0.75rem',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      background: vars.colors.semantic.error['600'],
      transform: 'scale(1.1)',
    },
    '&:focus': {
      outline: `2px solid ${vars.colors.semantic.error['200']}`,
      outlineOffset: '2px',
    },
  },
});

export const attachButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '44px',
  height: '44px',
  border: 'none',
  background: vars.background.secondary,
  borderRadius: '50%',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  color: vars.text.secondary,
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  selectors: {
    '&:hover': {
      background: vars.colors.primary['100'],
      color: vars.colors.primary['500'],
      transform: 'scale(1.05)',
    },
    '&:focus-within': {
      outline: `2px solid ${vars.colors.primary['500']}`,
      outlineOffset: '2px',
    },
  },
});

export const hiddenFileInput = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
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
  background: vars.colors.primary['500'],
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

export const visuallyHidden = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
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
  background: vars.background.secondary,
  border: 'none',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease',
  overflowY: 'auto',
  wordWrap: 'break-word',
  whiteSpace: 'pre-wrap',
});

globalStyle(`${messageTextAreaWrapper} textarea:focus`, {
  outline: 'none',
  background: vars.background.primary,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  transform: 'translateY(-1px)',
});

globalStyle(`${messageTextAreaWrapper} textarea::placeholder`, {
  color: vars.text.secondary,
});
