import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  marginLeft: '0.5rem',
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  fontSize: '0.6875rem',
  fontWeight: '500',
  background: vars.colors.primary['100'],
  color: vars.colors.primary['700'],
  border: `1px solid ${vars.colors.primary['200']}`,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
});
