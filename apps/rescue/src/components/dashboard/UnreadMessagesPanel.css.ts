import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const panel = style({
  marginBottom: vars.spacing['5'],
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${vars.spacing['3']} ${vars.spacing['4']}`,
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const headingGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

globalStyle(`${headingGroup} h3`, {
  margin: 0,
});

export const countBadge = style({
  backgroundColor: '#ef4444',
  color: 'white',
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
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
  gap: vars.spacing['1'],
  padding: `${vars.spacing['3']} ${vars.spacing['4']}`,
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
  gap: vars.spacing['2'],
});

export const senderName = style({
  fontWeight: vars.typography.weight.semibold,
  fontSize: '0.95rem',
});

export const timestamp = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  whiteSpace: 'nowrap',
});

export const snippet = style({
  fontSize: vars.typography.size.sm,
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
  marginRight: vars.spacing['2'],
});

export const footer = style({
  padding: '0.75rem 1.5rem',
  textAlign: 'center',
});

export const viewAllLink = style({
  color: vars.colors.infoTextEmphasis,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  textDecoration: 'none',
  ':hover': {
    textDecoration: 'underline',
  },
});
