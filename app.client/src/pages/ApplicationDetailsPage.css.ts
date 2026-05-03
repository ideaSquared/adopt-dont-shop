import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: '2rem',
  '@media': {
    '(max-width: 768px)': {
      padding: '1rem',
    },
  },
});

export const header = style({
  marginBottom: '2rem',
});

globalStyle(`${header} h1`, {
  fontSize: '2rem',
  color: '#111827',
  marginBottom: '0.5rem',
});

globalStyle(`${header} p`, {
  color: '#6b7280',
});

export const section = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '2rem',
  marginBottom: '2rem',
});

export const sectionTitle = style({
  fontSize: '1.25rem',
  color: '#111827',
  marginBottom: '1rem',
});

export const infoGrid = style({
  display: 'grid',
  gap: '1rem',
});

export const infoItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '0.75rem 0',
  borderBottom: '1px solid #e5e7eb',
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const infoLabel = style({
  fontWeight: '500',
  color: '#6b7280',
  minWidth: '120px',
});

export const infoValue = style({
  color: '#111827',
  textAlign: 'right',
  flex: '1',
});

export const statusBadge = recipe({
  base: {
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  variants: {
    status: {
      submitted: {
        background: '#ede9fe',
        color: '#6d28d9',
      },
      approved: {
        background: '#d1fae5',
        color: '#065f46',
      },
      rejected: {
        background: '#fee2e2',
        color: '#991b1b',
      },
      withdrawn: {
        background: '#e5e7eb',
        color: '#4b5563',
        border: '1px solid #d1d5db',
      },
      default: {
        background: '#f3f4f6',
        color: '#374151',
      },
    },
  },
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '300px',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  marginTop: '2rem',
});
