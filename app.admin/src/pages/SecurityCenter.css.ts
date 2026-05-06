import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  padding: '2rem',
  maxWidth: '1100px',
  margin: '0 auto',
});

export const pageHeader = style({
  marginBottom: '1.5rem',
});

globalStyle(`${pageHeader} h1`, {
  fontSize: '2rem',
  fontWeight: 700,
  color: '#1f2937',
  margin: '0 0 0.5rem 0',
});

globalStyle(`${pageHeader} p`, {
  fontSize: '1rem',
  color: '#6b7280',
  margin: 0,
});

export const tabBar = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
  borderBottom: '1px solid #e5e7eb',
  marginBottom: '1.5rem',
});

export const tabButton = style({
  background: 'transparent',
  border: 'none',
  padding: '0.75rem 1rem',
  fontSize: '0.95rem',
  color: '#6b7280',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  transition: 'all 120ms ease',
  selectors: {
    '&:hover': { color: '#111827' },
    '&[aria-selected="true"]': {
      color: '#1d4ed8',
      borderBottomColor: '#1d4ed8',
      fontWeight: 600,
    },
  },
});

export const section = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  marginBottom: '1.25rem',
});

globalStyle(`${section} h2`, {
  fontSize: '1.15rem',
  color: '#111827',
  margin: '0 0 0.5rem 0',
});

globalStyle(`${section} > p`, {
  fontSize: '0.9rem',
  color: '#6b7280',
  margin: '0 0 1rem 0',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
});

globalStyle(`${table} th, ${table} td`, {
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
  borderBottom: '1px solid #f3f4f6',
  fontSize: '0.875rem',
});

globalStyle(`${table} th`, {
  fontWeight: 600,
  color: '#374151',
  background: '#f9fafb',
});

export const inlineForm = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const input = style({
  padding: '0.4rem 0.6rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  minWidth: '140px',
});

export const select = style([input]);

export const dangerButton = style({
  background: '#dc2626',
  color: 'white',
  border: 'none',
  padding: '0.4rem 0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: '#b91c1c' },
    '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
  },
});

export const primaryButton = style({
  background: '#1d4ed8',
  color: 'white',
  border: 'none',
  padding: '0.4rem 0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: '#1e40af' },
    '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
  },
});

export const secondaryButton = style({
  background: 'white',
  color: '#374151',
  border: '1px solid #d1d5db',
  padding: '0.4rem 0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  selectors: { '&:hover': { background: '#f9fafb' } },
});

export const emptyState = style({
  padding: '1.5rem',
  textAlign: 'center',
  color: '#6b7280',
  fontSize: '0.9rem',
});

export const errorBanner = style({
  padding: '0.75rem 1rem',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  borderRadius: '0.375rem',
  marginBottom: '1rem',
  fontSize: '0.875rem',
});

export const statusPill = style({
  display: 'inline-block',
  padding: '0.15rem 0.5rem',
  borderRadius: '999px',
  fontSize: '0.75rem',
  fontWeight: 600,
});

export const statusSuccess = style([statusPill, { background: '#dcfce7', color: '#166534' }]);
export const statusFailure = style([statusPill, { background: '#fee2e2', color: '#991b1b' }]);
export const statusNeutral = style([statusPill, { background: '#e5e7eb', color: '#374151' }]);
