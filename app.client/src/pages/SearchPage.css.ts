import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const searchContainer = style({
  padding: '2rem 0',
  minHeight: 'calc(100vh - 200px)',
});

export const searchHeader = style({
  textAlign: 'center',
  marginBottom: '2rem',
});

globalStyle(`${searchHeader} h1`, {
  fontFamily: vars.typography.family.display,
  fontSize: '2.5rem',
  color: vars.text.primary,
  marginBottom: '1rem',
});

globalStyle(`${searchHeader} p`, {
  fontSize: '1.2rem',
  color: vars.text.secondary,
  maxWidth: '600px',
  margin: '0 auto',
});

globalStyle(`${searchHeader} h1`, {
  '@media': {
    '(max-width: 768px)': {
      fontSize: '2rem',
    },
  },
});

globalStyle(`${searchHeader} p`, {
  '@media': {
    '(max-width: 768px)': {
      fontSize: '1rem',
    },
  },
});

export const filtersCard = style({
  marginBottom: '2rem',
  padding: '1.5rem',
});

export const filtersGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '1rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const filterActions = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      justifyContent: 'center',
    },
  },
});

export const searchResults = style({
  marginBottom: '2rem',
});

export const resultsHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem',
  flexWrap: 'wrap',
  gap: '1rem',
});

globalStyle(`${resultsHeader} h2`, {
  color: vars.text.primary,
  margin: '0',
});

globalStyle(`${resultsHeader} .sort-controls`, {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const petGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1.5rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '1rem',
    },
  },
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '3rem 1rem',
  color: vars.text.secondary,
});

globalStyle(`${emptyState} h3`, {
  fontSize: '1.5rem',
  marginBottom: '1rem',
  color: vars.text.primary,
});

globalStyle(`${emptyState} p`, {
  fontSize: '1rem',
  marginBottom: '2rem',
});

export const pagination = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  marginTop: '2rem',
  flexWrap: 'wrap',
});

globalStyle(`${pagination} .page-info`, {
  color: vars.text.secondary,
  fontSize: '0.9rem',
});

globalStyle(`${pagination} .page-controls`, {
  display: 'flex',
  gap: '0.5rem',
});

export const locationFilterRow = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: '0.5rem',
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
  gap: '0.5rem',
  flex: '1',
  minWidth: '160px',
});

export const orLabel = style({
  fontSize: '0.875rem',
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

export const locationButton = style({
  whiteSpace: 'nowrap',
  minHeight: '42px',
});

export const locationHint = style({
  fontSize: '0.85rem',
  color: vars.text.tertiary,
  margin: '0 0 0.75rem 0',
});

export const locationStatus = recipe({
  base: {
    fontSize: '0.8rem',
    marginTop: '0.25rem',
  },
  variants: {
    variant: {
      success: { color: vars.text.success },
      error: { color: vars.text.error },
      info: { color: vars.text.tertiary },
    },
  },
});
