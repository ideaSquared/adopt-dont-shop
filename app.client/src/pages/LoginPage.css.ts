import { globalStyle, style } from '@vanilla-extract/css';

export const signupPrompt = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
});

globalStyle(`${signupPrompt} p`, {
  color: '#6b7280',
  marginBottom: '0.5rem',
});

globalStyle(`${signupPrompt} a`, {
  color: '#6366f1',
  textDecoration: 'none',
  fontWeight: '500',
});

globalStyle(`${signupPrompt} a:hover`, {
  textDecoration: 'underline',
});
