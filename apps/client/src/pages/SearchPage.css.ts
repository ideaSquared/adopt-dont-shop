import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const searchContainer = style({
  padding: `${vars.spacing['5']} 0`,
  minHeight: 'calc(100vh - 200px)',
});

export const filtersCard = style({
  marginBottom: vars.spacing['5'],
  padding: vars.spacing['4'],
});

export const filtersGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const filterActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      justifyContent: 'center',
    },
  },
});

export const searchResults = style({
  marginBottom: vars.spacing['5'],
});

export const resultsHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.spacing['4'],
  flexWrap: 'wrap',
  gap: vars.spacing['3'],
});

globalStyle(`${resultsHeader} h2`, {
  color: vars.text.primary,
  margin: '0',
});

globalStyle(`${resultsHeader} .sort-controls`, {
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
});

export const petGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: vars.spacing['4'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: vars.spacing['3'],
    },
  },
});

export const emptyState = style({
  textAlign: 'center',
  padding: `${vars.spacing['6']} ${vars.spacing['3']}`,
  color: vars.text.secondary,
});

globalStyle(`${emptyState} h3`, {
  fontSize: vars.typography.size['2xl'],
  marginBottom: vars.spacing['3'],
  color: vars.text.primary,
});

globalStyle(`${emptyState} p`, {
  fontSize: vars.typography.size.base,
  marginBottom: vars.spacing['5'],
});

export const pagination = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: vars.spacing['3'],
  marginTop: vars.spacing['5'],
  flexWrap: 'wrap',
});

globalStyle(`${pagination} .page-info`, {
  color: vars.text.secondary,
  fontSize: '0.9rem',
});

globalStyle(`${pagination} .page-controls`, {
  display: 'flex',
  gap: vars.spacing['2'],
});

export const locationFilterRow = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: vars.spacing['2'],
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});

export const locationInputGroup = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: vars.spacing['2'],
  flex: '1',
  minWidth: '160px',
});

export const orLabel = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
  whiteSpace: 'nowrap',
  paddingBottom: '10px',
  '@media': {
    '(max-width: 768px)': {
      paddingBottom: '0',
      textAlign: 'center',
    },
  },
});

// 2.5rem matches the Input control's md height, so the buttons line up with the
// Location field beside them. '&&' outranks the Button size class.
export const locationButton = style({
  whiteSpace: 'nowrap',
  selectors: {
    '&&': {
      boxSizing: 'border-box',
      height: '2.5rem',
      minHeight: '2.5rem',
    },
  },
});

export const locationHint = style({
  fontSize: '0.85rem',
  color: vars.text.tertiary,
  margin: '0 0 0.75rem 0',
});

export const locationStatus = recipe({
  base: {
    fontSize: '0.8rem',
    marginTop: vars.spacing['1'],
  },
  variants: {
    variant: {
      success: { color: vars.text.success },
      error: { color: vars.text.danger },
      info: { color: vars.text.tertiary },
    },
  },
});
