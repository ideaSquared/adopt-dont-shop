import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  padding: '3rem 0',
  maxWidth: '800px',
});

export const backLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: '#6b7280',
  textDecoration: 'none',
  fontSize: '0.9rem',
  marginBottom: '2rem',
  ':hover': {
    color: '#111827',
  },
});

export const articleTitle = style({
  fontSize: '2rem',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 2rem 0',
  lineHeight: '1.3',
  '@media': {
    '(max-width: 768px)': {
      fontSize: '1.6rem',
    },
  },
});

export const articleContent = style({
  color: '#111827',
  lineHeight: '1.8',
  fontSize: '1.05rem',
});

globalStyle(
  `${articleContent} h1, ${articleContent} h2, ${articleContent} h3, ${articleContent} h4, ${articleContent} h5, ${articleContent} h6`,
  {
    color: '#111827',
    margin: '2rem 0 1rem',
  }
);

globalStyle(`${articleContent} p`, {
  margin: '0 0 1.2rem',
});

globalStyle(`${articleContent} a`, {
  color: '#2563eb',
});

globalStyle(`${articleContent} a:hover`, {
  textDecoration: 'underline',
});

globalStyle(`${articleContent} img`, {
  maxWidth: '100%',
  borderRadius: '8px',
  margin: '1rem 0',
});

globalStyle(`${articleContent} ul, ${articleContent} ol`, {
  paddingLeft: '1.5rem',
  marginBottom: '1.2rem',
});

globalStyle(`${articleContent} blockquote`, {
  borderLeft: '4px solid #2563eb',
  margin: '1.5rem 0',
  padding: '0.5rem 1.5rem',
  color: '#6b7280',
  fontStyle: 'italic',
});

export const spinnerWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  padding: '4rem',
});
