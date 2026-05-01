import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const receiptWrapper = style({
  display: 'inline-flex',
  alignItems: 'center',
  marginLeft: '0.125rem',
  fontSize: '0.7rem',
  color: vars.text.tertiary,
  userSelect: 'none',
});

export const checkIcon = styleVariants({
  filled: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: vars.colors.primary['500'],
  },
  unfilled: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: vars.text.tertiary,
  },
});
