import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: vars.spacing['5'],
});

export const notificationCard = recipe({
  base: {
    marginBottom: vars.spacing['3'],
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
  padding: vars.spacing['3'],
});

globalStyle(`${notificationContent} .title`, {
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['2'],
  color: vars.text.primary,
});

globalStyle(`${notificationContent} .message`, {
  color: vars.text.tertiary,
  marginBottom: vars.spacing['2'],
});

globalStyle(`${notificationContent} .timestamp`, {
  fontSize: vars.typography.size.sm,
  color: vars.text.muted,
});

export const loadingList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});
