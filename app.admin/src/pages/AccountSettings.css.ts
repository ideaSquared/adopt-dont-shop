import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  padding: '2rem',
  maxWidth: '800px',
  margin: '0 auto',
});

export const pageHeader = style({
  marginBottom: '2rem',
});

globalStyle(`${pageHeader} h1`, {
  fontSize: '2rem',
  fontWeight: '700',
  color: '#1f2937',
  margin: '0 0 0.5rem 0',
});

globalStyle(`${pageHeader} p`, {
  fontSize: '1.1rem',
  color: '#6b7280',
  margin: 0,
});

export const section = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '0.75rem',
  padding: '2rem',
  marginBottom: '1.5rem',
});

globalStyle(`${section} h2`, {
  fontSize: '1.25rem',
  color: '#374151',
  margin: '0 0 0.5rem 0',
});

globalStyle(`${section} > p`, {
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: '0 0 1.5rem 0',
});
