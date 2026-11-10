import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: '3rem 0',
  minHeight: 'calc(100vh - 200px)',
});

export const articleList = style({
  maxWidth: '720px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const articleCard = style({
  display: 'block',
  padding: '1.5rem',
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '10px',
  textDecoration: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  ':hover': {
    borderColor: vars.colors.infoHover,
    boxShadow: '0 2px 12px rgba(37, 99, 235, 0.1)',
  },
});

export const articleTitle = style({
  fontSize: '1.1rem',
  fontWeight: '600',
  color: vars.text.primary,
  margin: '0 0 0.4rem 0',
});

export const articleExcerpt = style({
  fontSize: '0.9rem',
  color: vars.text.tertiary,
  margin: '0',
  lineHeight: '1.5',
});

export const spinnerWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  padding: '4rem',
});
