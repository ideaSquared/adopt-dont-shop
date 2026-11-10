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

export const filtersHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
});

export const filtersTitle = style({
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

// The search field with its submit button attached on the same line.
export const searchBar = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: vars.spacing['2'],
  marginBottom: vars.spacing['4'],
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});

export const searchField = style({
  flex: 1,
  minWidth: 0,
});

export const filtersGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['4'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
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

// The "where" line: place, use my location, and distance, bottom-aligned.
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
  flex: '1',
  minWidth: '200px',
});

export const distanceField = style({
  width: '12rem',
  flexShrink: 0,
  '@media': {
    '(max-width: 768px)': {
      width: '100%',
    },
  },
});

// The select trigger has a 200px min-width, wider than the filter columns and
// the distance field; let it shrink to its slot so selects keep their gaps.
globalStyle(`${filtersGrid} [role="combobox"], ${distanceField} [role="combobox"]`, {
  minWidth: 0,
});

// The shared Input wrapper adds a bottom margin; these rows align their
// children's bottoms, so without this the buttons sit that margin below the field.
globalStyle(`${searchField} > div, ${locationInputGroup} > div`, {
  marginBottom: 0,
});

// 2.5rem matches the Input control's md height, so buttons line up with the
// fields beside them. '&&' outranks the Button size class.
export const controlButton = style({
  whiteSpace: 'nowrap',
  selectors: {
    '&&': {
      boxSizing: 'border-box',
      height: '2.5rem',
      minHeight: '2.5rem',
    },
  },
});

export const buttonIcon = style({
  marginRight: vars.spacing['1'],
  flexShrink: 0,
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
