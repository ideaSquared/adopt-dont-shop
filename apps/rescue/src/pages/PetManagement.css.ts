import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  width: '100%',
  padding: vars.spacing['3'],
  '@media': {
    'screen and (min-width: 768px)': {
      padding: vars.spacing['4'],
    },
  },
});

export const contentWrapper = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  '@media': {
    'screen and (min-width: 768px)': {
      gap: '1.25rem',
    },
  },
});

export const headerActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
  alignItems: 'center',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
      justifyContent: 'stretch',
    },
  },
});

export const filtersContainer = style({
  margin: 0,
});

export const statusFilterSection = style({
  marginBottom: vars.spacing['3'],
});

export const advancedFiltersSection = style({
  margin: 0,
});

export const mainContent = style({
  margin: 0,
  padding: 0,
});

export const statsContainer = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
});
