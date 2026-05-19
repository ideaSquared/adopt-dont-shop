import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

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
  color: vars.text.tertiary,
});

export const result = style({
  marginTop: '1rem',
  padding: '0.875rem 1rem',
  border: `1px solid ${vars.colors.semantic.success['100']}`,
  background: '#ecfdf5',
  borderRadius: '8px',
  fontSize: '0.875rem',
});

export const error = style({
  marginTop: '1rem',
  padding: '0.875rem 1rem',
  border: `1px solid ${vars.colors.semantic.error['200']}`,
  background: vars.colors.semantic.error['50'],
  color: vars.colors.semantic.error['800'],
  borderRadius: '8px',
  fontSize: '0.875rem',
});
