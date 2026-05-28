import { style } from '@vanilla-extract/css';

export const activityList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const activityItem = style({
  display: 'flex',
  gap: '0.75rem',
  padding: '0.625rem 0',
  borderBottom: '1px solid #e5e7eb',
  ':last-child': {
    borderBottom: 'none',
  },
});

export const activityDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#3b82f6',
  marginTop: '0.375rem',
  flexShrink: 0,
});

export const activityContent = style({
  flex: 1,
  minWidth: 0,
});

export const activityDescription = style({
  fontSize: '0.8125rem',
  color: '#111827',
  margin: 0,
});

export const activityMeta = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  margin: '0.125rem 0 0 0',
});

export const activityEmpty = style({
  padding: '2rem 1rem',
  textAlign: 'center',
  color: '#6b7280',
  fontSize: '0.875rem',
});
