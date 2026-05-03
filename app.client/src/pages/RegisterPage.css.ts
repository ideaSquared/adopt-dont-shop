import { globalStyle, style } from '@vanilla-extract/css';

export const loginPrompt = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #d1d5db',
});

globalStyle(`${loginPrompt} p`, {
  color: '#6b7280',
  marginBottom: '0.5rem',
});

globalStyle(`${loginPrompt} a`, {
  color: '#4f46e5',
  textDecoration: 'none',
  fontWeight: '500',
});

globalStyle(`${loginPrompt} a:hover`, {
  textDecoration: 'underline',
});
