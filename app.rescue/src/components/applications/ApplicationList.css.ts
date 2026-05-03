import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.7 },
});

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

export const selectionCount = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const sortSelect = style({
  fontSize: '0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  padding: '0.5rem',
  background: 'white',
});

export const tableContainer = style({
  background: 'white',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  borderRadius: '0.375rem',
  overflow: 'hidden',
});

export const loadingContainer = style({
  padding: '2rem',
  textAlign: 'center',
});

export const spinner = style({
  display: 'inline-block',
  width: '2rem',
  height: '2rem',
  border: '2px solid #e5e7eb',
  borderTop: '2px solid #3b82f6',
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`,
});

export const loadingText = style({
  marginTop: '0.5rem',
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const emptyContainer = style({
  padding: '2rem',
  textAlign: 'center',
});

export const emptyText = style({
  color: '#6b7280',
});

export const tableWrapper = style({
  overflowX: 'auto',
});

export const table = style({
  minWidth: '100%',
  borderCollapse: 'collapse',
});

export const tableHead = style({
  background: '#f9fafb',
});

export const tableRow = style({
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: '#f9fafb',
    },
  },
});

export const tableHeader = style({
  padding: '0.75rem 1.5rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: '500',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

export const tableBody = style({
  background: 'white',
  borderTop: '1px solid #e5e7eb',
});

export const tableCell = style({
  padding: '1rem 1.5rem',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #e5e7eb',
  selectors: {
    '&:last-child': {
      textAlign: 'right',
    },
  },
});

export const checkboxCell = style({
  padding: '1rem 1.5rem',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #e5e7eb',
});

export const checkbox = style({
  borderRadius: '0.25rem',
  border: '1px solid #d1d5db',
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

export const priorityBadge = recipe({
  base: {
    display: 'inline-flex',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    borderRadius: '9999px',
  },
  variants: {
    priority: {
      urgent: {
        background: '#fecaca',
        color: '#dc2626',
        border: '1px solid #dc2626',
        animation: `${pulse} 2s infinite`,
      },
      high: { background: '#fed7d7', color: '#c53030' },
      medium: { background: '#fef3c7', color: '#92400e' },
      low: { background: '#dcfce7', color: '#166534' },
      default: { background: '#f3f4f6', color: '#374151' },
    },
  },
  defaultVariants: {
    priority: 'default',
  },
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

export const actionButton = recipe({
  base: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    borderRadius: '0.375rem',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  variants: {
    variant: {
      primary: {
        background: '#3b82f6',
        color: 'white',
        borderColor: '#3b82f6',
        selectors: {
          '&:hover': { background: '#2563eb', borderColor: '#2563eb' },
        },
      },
      danger: {
        background: '#ef4444',
        color: 'white',
        borderColor: '#ef4444',
        selectors: {
          '&:hover': { background: '#dc2626', borderColor: '#dc2626' },
        },
      },
      secondary: {
        background: 'white',
        color: '#374151',
        borderColor: '#d1d5db',
        selectors: {
          '&:hover': { background: '#f9fafb', borderColor: '#9ca3af' },
        },
      },
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

export const errorContainer = style({
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '0.375rem',
  padding: '1rem',
});

export const errorContent = style({
  display: 'flex',
});

export const errorText = style({
  marginLeft: '0.75rem',
});

export const errorTitle = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#991b1b',
  margin: '0 0 0.25rem 0',
});

export const errorMessage = style({
  fontSize: '0.875rem',
  color: '#b91c1c',
  margin: 0,
});
