import { style } from '@vanilla-extract/css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  maxWidth: '720px',
});

export const channelsRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
});

export const channelLabel = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
});

export const actions = style({
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
});

export const previewLabel = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const result = style({
  marginTop: '1rem',
  padding: '0.875rem 1rem',
  border: '1px solid #d1fae5',
  background: '#ecfdf5',
  borderRadius: '8px',
  fontSize: '0.875rem',
});

export const error = style({
  marginTop: '1rem',
  padding: '0.875rem 1rem',
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
  borderRadius: '8px',
  fontSize: '0.875rem',
});
