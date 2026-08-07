import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const tableContainer = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  overflow: 'hidden',
});

export const tableWrapper = style({
  overflowX: 'auto',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
});

export const thead = style({
  background: '#f9fafb',
  borderBottom: '2px solid #e5e7eb',
});

export const th = recipe({
  base: {
    padding: '1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transition: 'background 0.2s ease',
  },
  variants: {
    align: {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
    },
    sortable: {
      true: {
        cursor: 'pointer',
        ':hover': { background: '#f3f4f6' },
      },
      false: {
        cursor: 'default',
        ':hover': { background: 'transparent' },
      },
    },
  },
});

export const thContent = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  justifyContent: 'flex-start',
});

export const sortIcon = style({
  display: 'flex',
  alignItems: 'center',
  color: '#9ca3af',
});

globalStyle(`${sortIcon} svg`, {
  fontSize: '1rem',
});

export const tbody = style({});

export const tr = recipe({
  base: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background 0.2s ease',
    selectors: {
      '&:last-child': {
        borderBottom: 'none',
      },
    },
  },
  variants: {
    clickable: {
      true: {
        cursor: 'pointer',
        ':hover': { background: '#f9fafb' },
      },
      false: {
        cursor: 'default',
        ':hover': { background: 'transparent' },
      },
    },
  },
});

export const td = recipe({
  base: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#111827',
  },
  variants: {
    align: {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
    },
  },
});

export const checkbox = style({
  width: '1rem',
  height: '1rem',
  cursor: 'pointer',
  accentColor: vars.colors.primaryHover,
});

export const emptyRow = style({});

globalStyle(`${emptyRow} td`, {
  padding: '3rem',
  textAlign: 'center',
  color: '#6b7280',
});

/**
 * ADS UX B6 — responsive card fallback. Below the mobile breakpoint every admin
 * table row collapses into a stacked label/value card: the header row is
 * visually hidden and each data cell shows its column label (from `data-label`)
 * beside the value, so data-dense tables stay usable on small screens without
 * horizontal scrolling. Applied to every admin table by default. The
 * empty/error colspan row carries no `data-label`, so it keeps its centred
 * message rather than becoming a label/value pair.
 */
const MOBILE_CARDS = 'screen and (max-width: 640px)';

export const responsiveCards = style({});

globalStyle(`${responsiveCards} thead`, {
  '@media': {
    [MOBILE_CARDS]: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0,
    },
  },
});

globalStyle(`${responsiveCards} tbody tr`, {
  '@media': {
    [MOBILE_CARDS]: {
      display: 'block',
      marginBottom: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '4px 8px',
    },
  },
});

globalStyle(`${responsiveCards} td[data-label]`, {
  '@media': {
    [MOBILE_CARDS]: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '12px',
      padding: '6px 4px',
      textAlign: 'right',
    },
  },
});

globalStyle(`${responsiveCards} td[data-label]::before`, {
  '@media': {
    [MOBILE_CARDS]: {
      content: 'attr(data-label)',
      fontWeight: 600,
      color: '#6b7280',
      textAlign: 'left',
    },
  },
});

export const paginationContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1rem',
  borderTop: '1px solid #e5e7eb',
  background: '#f9fafb',
});

export const paginationInfo = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const paginationControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const pageButtonBase = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '32px',
  height: '32px',
  padding: '0 0.5rem',
  border: '1px solid',
  borderRadius: '6px',
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

globalStyle(`${pageButtonBase} svg`, {
  fontSize: '1rem',
});

export const pageButton = recipe({
  base: [pageButtonBase],
  variants: {
    active: {
      true: {
        background: vars.colors.primaryHover,
        color: '#ffffff',
        borderColor: vars.colors.primaryHover,
        ':hover': {
          background: vars.colors.primaryActive,
        },
      },
      false: {
        background: '#ffffff',
        color: '#374151',
        borderColor: '#d1d5db',
        ':hover': {
          background: '#f9fafb',
        },
      },
    },
  },
});

export const checkboxColumn = style({
  width: '48px',
});

export const sortIconInactive = style({
  opacity: 0.3,
});
