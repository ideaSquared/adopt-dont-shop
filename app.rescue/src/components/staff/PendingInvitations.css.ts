import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const container = style({
  background: 'white',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
});

export const header = style({
  padding: '1.5rem',
  borderBottom: '1px solid #e9ecef',
  background: '#f8f9fa',
  selectors: {
    '& h3': {
      margin: '0 0 0.5rem 0',
      color: '#333',
      fontWeight: '600',
      fontSize: '1.1rem',
    },
    '& p': {
      margin: '0',
      color: '#666',
      fontSize: '0.9rem',
    },
  },
});

export const invitationsList = style({
  padding: '1rem',
});

export const invitationCard = recipe({
  base: {
    padding: '1.25rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    transition: 'all 0.2s ease',
    selectors: {
      '&:last-child': {
        marginBottom: '0',
      },
      '&:hover': {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  variants: {
    isExpiring: {
      true: {
        border: '2px solid #ffc107',
        background: '#fff3cd',
      },
      false: {
        border: '2px solid #e9ecef',
        background: 'white',
      },
    },
  },
  defaultVariants: {
    isExpiring: false,
  },
});

export const invitationHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '0.75rem',
  gap: '1rem',
  '@media': {
    '(max-width: 640px)': {
      flexDirection: 'column',
    },
  },
});

export const invitationInfo = style({
  flex: 1,
});

export const email = style({
  fontWeight: '600',
  color: '#333',
  fontSize: '1rem',
  marginBottom: '0.25rem',
  wordBreak: 'break-all',
});

export const title = style({
  color: '#666',
  fontSize: '0.9rem',
  marginBottom: '0.5rem',
});

export const metaInfo = style({
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  marginTop: '0.5rem',
});

export const metaItem = style({
  color: '#666',
  fontSize: '0.85rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  selectors: {
    '& strong': {
      color: '#333',
    },
  },
});

export const statusBadge = recipe({
  base: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  variants: {
    status: {
      active: {
        background: '#d1f4e0',
        color: '#0a7b3e',
      },
      expiring: {
        background: '#fff3cd',
        color: '#856404',
      },
    },
  },
});

export const actions = style({
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  '@media': {
    '(max-width: 640px)': {
      width: '100%',
      justifyContent: 'flex-end',
    },
  },
});

export const actionButton = recipe({
  base: {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
  variants: {
    variant: {
      danger: {
        background: '#dc3545',
        color: 'white',
        selectors: {
          '&:hover:not(:disabled)': {
            background: '#c82333',
          },
        },
      },
      default: {
        background: '#f8f9fa',
        color: '#495057',
        border: '1px solid #dee2e6',
        selectors: {
          '&:hover:not(:disabled)': {
            background: '#e9ecef',
          },
        },
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export const emptyState = style({
  padding: '3rem 2rem',
  textAlign: 'center',
  color: '#666',
});

export const emptyIcon = style({
  fontSize: '3rem',
  marginBottom: '1rem',
});

export const emptyText = style({
  fontSize: '1.1rem',
  color: '#666',
  selectors: {
    '& p': {
      margin: '0.5rem 0',
    },
  },
});

export const loadingContainer = style({
  padding: '3rem 2rem',
  textAlign: 'center',
  color: '#666',
});

export const loadingSpinner = style({
  width: '3rem',
  height: '3rem',
  border: '3px solid #e9ecef',
  borderTop: '3px solid #1976d2',
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`,
  margin: '0 auto 1rem',
});
