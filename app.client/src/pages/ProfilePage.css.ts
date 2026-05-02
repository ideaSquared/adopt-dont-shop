import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '2rem',
  '@media': {
    '(max-width: 768px)': {
      padding: '1rem',
    },
  },
});

export const header = style({
  marginBottom: '3rem',
  selectors: {
    '& h1': {
      fontSize: '2.5rem',
      color: '#111827',
      marginBottom: '0.5rem',
    },
    '& p': {
      fontSize: '1.1rem',
      color: '#6b7280',
    },
  },
  '@media': {
    '(max-width: 768px)': {
      selectors: {
        '& h1': {
          fontSize: '2rem',
        },
      },
      marginBottom: '2rem',
    },
  },
});

export const tabContainer = style({
  borderBottom: '1px solid #e5e7eb',
  marginBottom: '2rem',
});

export const tabList = style({
  display: 'flex',
  gap: '2rem',
});

export const tab = recipe({
  base: {
    background: 'none',
    border: 'none',
    padding: '1rem 0',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      color: '#4f46e5',
    },
  },
  variants: {
    active: {
      true: {
        color: '#4f46e5',
        borderBottom: '2px solid #4f46e5',
      },
      false: {
        color: '#6b7280',
        borderBottom: '2px solid transparent',
      },
    },
  },
});

export const section = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '2rem',
  marginBottom: '2rem',
});

export const sectionTitle = style({
  fontSize: '1.5rem',
  color: '#111827',
  marginBottom: '1rem',
});

export const profileInfo = style({
  display: 'grid',
  gap: '1rem',
});

export const infoItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 0',
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
});

export const infoValue = style({
  color: '#111827',
});

export const applicationsGrid = style({
  display: 'grid',
  gap: '1rem',
});

export const applicationCard = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1.5rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const applicationInfo = style({
  selectors: {
    '& h3': {
      fontSize: '1.1rem',
      color: '#111827',
      marginBottom: '0.5rem',
    },
    '& p': {
      color: '#6b7280',
      fontSize: '0.875rem',
    },
  },
});

export const statusBadge = recipe({
  base: {
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
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
  minHeight: '200px',
});
