import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: vars.spacing['5'],
  maxWidth: '800px',
  margin: '0 auto',
});
