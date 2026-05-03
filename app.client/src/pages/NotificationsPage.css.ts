import { globalStyle, style } from '@vanilla-extract/css';
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
  color: '#111827',
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
  color: '#111827',
});

globalStyle(`${notificationContent} .message`, {
  color: '#6b7280',
  marginBottom: '0.5rem',
});

globalStyle(`${notificationContent} .timestamp`, {
  fontSize: '0.875rem',
  color: '#9ca3af',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '3rem',
  color: '#6b7280',
});

globalStyle(`${emptyState} .icon`, {
  fontSize: '3rem',
  marginBottom: '1rem',
});
