import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: '2rem',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem',
});

globalStyle(`${header} h1`, {
  margin: '0',
  color: vars.text.primary,
});

export const notificationCard = recipe({
  base: {
    marginBottom: '1rem',
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },
  },
  variants: {
    isRead: {
      true: {
        opacity: '0.6',
        borderLeft: '4px solid transparent',
      },
      false: {
        opacity: '1',
        borderLeft: '4px solid #6366f1',
      },
    },
  },
});

export const notificationContent = style({
  padding: '1rem',
});

globalStyle(`${notificationContent} .title`, {
  fontWeight: '600',
  marginBottom: '0.5rem',
  color: vars.text.primary,
});

globalStyle(`${notificationContent} .message`, {
  color: vars.text.tertiary,
  marginBottom: '0.5rem',
});

globalStyle(`${notificationContent} .timestamp`, {
  fontSize: '0.875rem',
  color: vars.text.muted,
});

export const emptyState = style({
  textAlign: 'center',
  padding: '3rem',
  color: vars.text.tertiary,
});

globalStyle(`${emptyState} .icon`, {
  fontSize: '3rem',
  marginBottom: '1rem',
});
