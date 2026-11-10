import { style } from '@vanilla-extract/css';
import { media, vars } from '@adopt-dont-shop/lib.components/theme';

export const statsContainer = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['6'],
  '@media': {
    [media.up('md')]: { gridTemplateColumns: 'repeat(2, 1fr)' },
    [media.up('lg')]: { gridTemplateColumns: 'repeat(4, 1fr)' },
  },
});
