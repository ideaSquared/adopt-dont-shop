import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components';

export const avatar = style({
  width: '40px',
  height: '40px',
  minWidth: '40px',
  minHeight: '40px',
  borderRadius: '50%',
  background: `linear-gradient(135deg, ${vars.colors.primary['100']}, ${vars.colors.primary['300']})`,
  color: vars.colors.primary['700'],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '700',
  fontSize: '1.15rem',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  marginRight: '0.4rem',
  border: `2px solid ${vars.colors.primary['300']}`,
  userSelect: 'none',
});
