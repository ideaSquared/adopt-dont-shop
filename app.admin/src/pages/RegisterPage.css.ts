import { globalStyle, style } from '@vanilla-extract/css';

export const loginPrompt = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
});

globalStyle(`${loginPrompt} p`, {
  color: '#6b7280',
  marginBottom: '0.5rem',
});

globalStyle(`${loginPrompt} a`, {
  color: '#667eea',
  textDecoration: 'none',
  fontWeight: '500',
});

globalStyle(`${loginPrompt} a:hover`, {
  textDecoration: 'underline',
});

export const helperText = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  lineHeight: 1.4,
});

globalStyle(`${helperText} strong`, {
  color: '#374151',
});
