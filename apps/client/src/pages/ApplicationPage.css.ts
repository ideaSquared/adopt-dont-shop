import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: vars.spacing['5'],
  '@media': {
    '(max-width: 768px)': {
      padding: vars.spacing['3'],
    },
  },
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});

export const backToSearchButton = style({
  marginTop: vars.spacing['3'],
});

export const sectionAlert = style({
  marginBottom: vars.spacing['5'],
});
