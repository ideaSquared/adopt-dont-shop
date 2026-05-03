import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
});

export const header = style({
  display: 'flex',
  justifyContent: 'between',
  alignItems: 'center',
  marginBottom: '2rem',
});

export const title = style({
  fontSize: '2rem',
  color: '#111827',
  margin: '0',
});

export const applicationGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '1.5rem',
});

export const applicationCard = style({
  padding: '1.5rem',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
});

export const petInfo = style({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const petDetailsH3 = style({
  margin: '0 0 0.25rem 0',
  fontSize: '1.25rem',
  color: '#111827',
});

export const petDetailsP = style({
  margin: '0',
  color: '#6b7280',
  fontSize: '0.875rem',
});

export const statusBadge = recipe({
  base: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: 'white',
  },
  variants: {
    status: {
      submitted: { background: '#3b82f6' },
      under_review: { background: '#8b5cf6' },
      approved: { background: '#10b981' },
      rejected: { background: '#ef4444' },
      default: { background: '#6b7280' },
    },
  },
});

export const applicationDetails = style({
  marginTop: '1rem',
});

globalStyle(`${applicationDetails} p`, {
  margin: '0.5rem 0',
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const actionButtons = style({
  display: 'flex',
  gap: '0.75rem',
  marginTop: '1rem',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '4rem 2rem',
});

globalStyle(`${emptyState} h2`, {
  color: '#6b7280',
  marginBottom: '1rem',
});

globalStyle(`${emptyState} p`, {
  color: '#6b7280',
  marginBottom: '2rem',
});
