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
  accentColor: vars.colors.primary['600'],
});

export const emptyRow = style({});

globalStyle(`${emptyRow} td`, {
  padding: '3rem',
  textAlign: 'center',
  color: '#6b7280',
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
        background: vars.colors.primary['600'],
        color: '#ffffff',
        borderColor: vars.colors.primary['600'],
        ':hover': {
          background: vars.colors.primary['700'],
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
