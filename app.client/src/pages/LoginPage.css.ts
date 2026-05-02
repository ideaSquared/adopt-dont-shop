import { style } from '@vanilla-extract/css';

export const signupPrompt = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
  selectors: {
    '& p': {
      color: '#6b7280',
      marginBottom: '0.5rem',
    },
    '& a': {
      color: '#6366f1',
      textDecoration: 'none',
      fontWeight: '500',
    },
    '& a:hover': {
      textDecoration: 'underline',
    },
  },
});
