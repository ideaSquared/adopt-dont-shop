import { style } from '@vanilla-extract/css';

export const widgetContainer = style({
  padding: '0.75rem',
  background: '#f8fafc',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
});

export const widgetHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.75rem',
});

export const widgetTitle = style({
  margin: 0,
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
});

export const viewAllButton = style({
  padding: '0.25rem 0.5rem',
  background: 'none',
  border: '1px solid #d1d5db',
  borderRadius: '0.25rem',
  fontSize: '0.75rem',
  color: '#6b7280',
  cursor: 'pointer',
  ':hover': {
    background: '#f3f4f6',
    color: '#374151',
  },
});

export const compactEventList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const compactEvent = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.375rem',
  background: 'white',
  borderRadius: '0.25rem',
  border: '1px solid #e5e7eb',
});

export const eventIcon = style({
  flexShrink: 0,
  width: '1.5rem',
  height: '1.5rem',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.625rem',
  color: 'white',
});

export const eventInfo = style({
  flex: 1,
  minWidth: 0,
});

export const eventTitle = style({
  fontSize: '0.75rem',
  fontWeight: '500',
  color: '#374151',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const eventTime = style({
  fontSize: '0.625rem',
  color: '#6b7280',
  marginTop: '0.125rem',
});

export const systemIndicator = style({
  flexShrink: 0,
  fontSize: '0.5rem',
  color: '#9ca3af',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '1rem',
  color: '#6b7280',
  fontSize: '0.75rem',
});
