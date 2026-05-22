import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const panel = style({
  marginBottom: '2rem',
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1rem 1.5rem',
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const headingGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

globalStyle(`${headingGroup} h3`, {
  margin: 0,
});

export const countBadge = style({
  backgroundColor: '#ef4444',
  color: 'white',
  fontSize: '0.75rem',
  fontWeight: 600,
  padding: '0.25rem 0.5rem',
  borderRadius: '10px',
  minWidth: '1.25rem',
  textAlign: 'center',
});

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

export const rowLink = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  padding: '1rem 1.5rem',
  borderBottom: `1px solid ${vars.border.color.default}`,
  textDecoration: 'none',
  color: 'inherit',
  ':hover': {
    backgroundColor: '#f9fafb',
  },
});

export const rowTopLine = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
});

export const senderName = style({
  fontWeight: 600,
  fontSize: '0.95rem',
});

export const timestamp = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  whiteSpace: 'nowrap',
});

export const snippet = style({
  fontSize: '0.875rem',
  color: '#4b5563',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

export const unreadDot = style({
  display: 'inline-block',
  width: '8px',
  height: '8px',
  backgroundColor: '#3b82f6',
  borderRadius: '50%',
  marginRight: '0.5rem',
});

export const emptyState = style({
  padding: '1.5rem',
  textAlign: 'center',
  color: '#6b7280',
});

globalStyle(`${emptyState} p`, {
  margin: '0.25rem 0',
  fontSize: '0.875rem',
});

export const footer = style({
  padding: '0.75rem 1.5rem',
  textAlign: 'center',
});

export const viewAllLink = style({
  color: vars.colors.infoTextEmphasis,
  fontSize: '0.875rem',
  fontWeight: 500,
  textDecoration: 'none',
  ':hover': {
    textDecoration: 'underline',
  },
});
