import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: '3rem 0',
  minHeight: 'calc(100vh - 200px)',
});

export const postGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '2rem',
});

export const postCard = style({
  display: 'flex',
  flexDirection: 'column',
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '12px',
  overflow: 'hidden',
  textDecoration: 'none',
  transition: 'transform 0.2s, box-shadow 0.2s',
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
});

export const postImage = style({
  width: '100%',
  height: '200px',
  objectFit: 'cover',
});

export const postImagePlaceholder = style({
  width: '100%',
  height: '200px',
  background: vars.background.body,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '3rem',
});

export const postBody = style({
  padding: '1.5rem',
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const postTitle = style({
  fontSize: '1.25rem',
  fontWeight: '600',
  color: vars.text.primary,
  margin: '0',
  lineHeight: '1.4',
});

export const postExcerpt = style({
  fontSize: '0.9rem',
  color: vars.text.tertiary,
  margin: '0',
  lineHeight: '1.6',
  flex: '1',
  display: '-webkit-box',
  WebkitLineClamp: '3',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const postDate = style({
  fontSize: '0.8rem',
  color: vars.text.tertiary,
  marginTop: '0.5rem',
});

export const spinnerWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  padding: '4rem',
});
