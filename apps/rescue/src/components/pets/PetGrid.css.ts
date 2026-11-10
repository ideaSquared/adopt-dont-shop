import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const gridContainer = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: vars.spacing['3'],
  marginBottom: 0,
  marginTop: 0,
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '0.75rem',
    },
    '(min-width: 1024px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '1.25rem',
    },
  },
});

export const emptyState = style({
  padding: vars.spacing['6'],
  textAlign: 'center',
  gridColumn: '1 / -1',
});

// ADS-646: empty-state CTAs sit side-by-side ("Add" + "Import CSV") with a
// follow-up hint link to the importer docs. Keeps the two onboarding paths
// equally discoverable.
export const emptyStateActions = style({
  display: 'flex',
  justifyContent: 'center',
  gap: '0.75rem',
  flexWrap: 'wrap',
});

export const emptyStateCsvHint = style({
  marginTop: vars.spacing['3'],
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
});

export const emptyStateCsvLink = style({
  color: '#2563eb',
  textDecoration: 'underline',
});

globalStyle(`${emptyState} .empty-icon`, {
  fontSize: vars.typography.size['5xl'],
  marginBottom: vars.spacing['3'],
});

globalStyle(`${emptyState} h3`, {
  marginBottom: vars.spacing['2'],
  color: '#111827',
});

globalStyle(`${emptyState} p`, {
  color: '#6b7280',
  marginBottom: vars.spacing['4'],
});

export const loadingGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: vars.spacing['3'],
  marginBottom: 0,
  '@media': {
    '(min-width: 1024px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: vars.spacing['4'],
    },
  },
});

export const paginationContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: vars.spacing['3'],
  marginTop: vars.spacing['5'],
  padding: vars.spacing['3'],
  '@media': {
    '(max-width: 768px)': {
      flexWrap: 'wrap',
      gap: vars.spacing['2'],
    },
  },
});

export const pageButton = style({
  minWidth: '40px',
  height: '40px',
  padding: vars.spacing['2'],
});

export const pageButtonCurrent = style({
  backgroundColor: '#2563eb',
  color: 'white',
});

export const pageCounter = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  whiteSpace: 'nowrap',
});
