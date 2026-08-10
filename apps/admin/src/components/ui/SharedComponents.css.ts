import { globalStyle, style } from '@vanilla-extract/css';

// Page Layout
export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const pageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '1rem',
});

export const headerLeft = style({});

globalStyle(`${headerLeft} h1`, {
  fontSize: '2rem',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 0.5rem 0',
});

globalStyle(`${headerLeft} p`, {
  fontSize: '1rem',
  color: '#6b7280',
  margin: '0',
});

// Card
export const card = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
});

export const cardHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const cardTitle = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0',
});

export const cardContent = style({
  color: '#374151',
});
