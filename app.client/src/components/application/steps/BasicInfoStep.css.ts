import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const stepContainer = style({
  padding: '2rem 0',
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1.5rem',
  marginBottom: '2rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '1rem',
    },
  },
});

export const fullWidthField = style({
  gridColumn: '1 / -1',
});

export const title = style({
  color: vars.colors.neutral['900'],
  marginBottom: '1rem',
  fontSize: '1.5rem',
  fontWeight: 600,
});

export const description = style({
  color: vars.colors.neutral['600'],
  marginBottom: '2rem',
  lineHeight: 1.6,
});
