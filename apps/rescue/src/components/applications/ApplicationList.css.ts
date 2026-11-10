import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const statsSection = style({
  marginBottom: '1rem',
});

export const filtersSection = style({
  marginBottom: '1rem',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const headerLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const headerRight = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const title = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
  margin: 0,
});

export const tableContainer = style({
  background: 'white',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  borderRadius: '0.375rem',
  overflow: 'hidden',
});

export const tableRow = style({
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: '#f9fafb',
    },
  },
});

export const applicantInfo = style({
  display: 'flex',
  flexDirection: 'column',
});

export const applicantName = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#111827',
});

export const applicantEmail = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const petInfo = style({
  display: 'flex',
  flexDirection: 'column',
});

export const petName = style({
  fontSize: '0.875rem',
  color: '#111827',
});

export const petDetails = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const progressIndicators = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  minWidth: '200px',
});

export const progressBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.125rem',
  flex: 1,
});

export const progressStep = recipe({
  base: {
    height: '4px',
    flex: 1,
    borderRadius: '2px',
    position: 'relative',
  },
  variants: {
    status: {
      completed: {
        background: '#10b981',
        '::after': {
          content: "''",
          position: 'absolute',
          right: '-3px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#10b981',
          border: '2px solid white',
          boxShadow: '0 0 0 2px #10b981',
        },
      },
      current: {
        background: '#3b82f6',
        '::after': {
          content: "''",
          position: 'absolute',
          right: '-3px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#3b82f6',
          border: '2px solid white',
          boxShadow: '0 0 0 2px #3b82f6',
        },
      },
      pending: {
        background: '#e5e7eb',
        '::after': {
          content: "''",
          position: 'absolute',
          right: '-3px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#9ca3af',
          border: '2px solid white',
        },
      },
    },
    isLast: {
      true: {
        '::after': {
          display: 'none',
        },
      },
      false: {},
    },
  },
  defaultVariants: {
    status: 'pending',
    isLast: false,
  },
});

export const progressLabel = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  marginLeft: '0.5rem',
  whiteSpace: 'nowrap',
});

export const actionsContainer = style({
  display: 'flex',
  gap: '0.25rem',
  alignItems: 'center',
});

// Visually hidden, still announced by screen readers.
export const srOnly = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});
