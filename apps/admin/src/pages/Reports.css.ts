import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const buttonIcon = style({
  marginRight: '0.5rem',
});

export const reportList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const reportRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '12px',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '8px',
  textDecoration: 'none',
  color: 'inherit',
});

export const subtleSmall = style({
  color: vars.text.tertiary,
  fontSize: '13px',
});

export const subtleScope = style({
  color: vars.text.tertiary,
  fontSize: '12px',
});

export const templatesCard = style({
  marginTop: '16px',
});

export const templatesGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '12px',
});

export const templateCard = style({
  display: 'block',
  padding: '14px',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '8px',
  textDecoration: 'none',
  color: 'inherit',
});

export const templateDescription = style({
  color: vars.text.tertiary,
  fontSize: '12px',
  marginTop: '4px',
});
