import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  padding: '2rem',
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '0.75rem',
  textAlign: 'center',
});

export const heading = style({
  fontSize: '1.5rem',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

export const intro = style({
  color: vars.text.secondary,
  margin: '0 0 1.5rem 0',
});

export const nextSteps = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  textAlign: 'left',
  margin: '0 auto 2rem',
  maxWidth: '480px',
  padding: 0,
  listStyle: 'none',
});

export const nextStepItem = style({
  padding: '0.75rem 1rem',
  background: vars.background.primary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '0.5rem',
  color: vars.text.primary,
  fontSize: '0.9375rem',
});

export const actions = style({
  display: 'flex',
  justifyContent: 'center',
  gap: '0.75rem',
  flexWrap: 'wrap',
});
