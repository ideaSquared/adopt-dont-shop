import { globalStyle, style } from '@vanilla-extract/css';

export const registerPrompt = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
});

globalStyle(`${registerPrompt} p`, {
  color: '#6b7280',
  marginBottom: '0.5rem',
});

globalStyle(`${registerPrompt} a`, {
  color: '#667eea',
  textDecoration: 'none',
  fontWeight: '500',
});

globalStyle(`${registerPrompt} a:hover`, {
  textDecoration: 'underline',
});

export const manageCookies = style({
  textAlign: 'center',
  marginTop: '1rem',
});

export const helperText = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  lineHeight: 1.4,
  marginTop: '0.5rem',
});

globalStyle(`${helperText} strong`, {
  color: '#374151',
});
