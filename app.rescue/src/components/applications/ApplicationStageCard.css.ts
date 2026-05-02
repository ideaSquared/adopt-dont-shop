import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const cardContainer = style({
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '1rem',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#3b82f6',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)',
    transform: 'translateY(-1px)',
  },
});

export const cardHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '0.75rem',
});

export const petInfo = style({
  flex: 1,
});

export const petName = style({
  margin: 0,
  fontSize: '1rem',
  fontWeight: '600',
  color: '#1f2937',
});

export const applicantName = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  marginTop: '0.25rem',
});

export const priority = recipe({
  base: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  },
  variants: {
    priority: {
      urgent: { background: '#fee2e2', color: '#dc2626' },
      high: { background: '#fef3c7', color: '#d97706' },
      medium: { background: '#dbeafe', color: '#2563eb' },
      low: { background: '#f3f4f6', color: '#6b7280' },
      default: { background: '#f3f4f6', color: '#6b7280' },
    },
  },
  defaultVariants: {
    priority: 'default',
  },
});

export const progressBar = style({
  width: '100%',
  height: '4px',
  background: '#f3f4f6',
  borderRadius: '2px',
  overflow: 'hidden',
  margin: '0.75rem 0',
});

export const progressFill = style({
  height: '100%',
  background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
  transition: 'width 0.3s ease',
});

export const cardBody = style({
  marginBottom: '0.75rem',
});

export const metaInfo = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.75rem',
  color: '#6b7280',
  marginBottom: '0.5rem',
});

export const statusBadges = style({
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  marginBottom: '0.5rem',
});

export const statusBadge = recipe({
  base: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  variants: {
    status: {
      completed: { background: '#d1fae5', color: '#065f46' },
      in_progress: { background: '#fef3c7', color: '#92400e' },
      failed: { background: '#fee2e2', color: '#991b1b' },
      pending: { background: '#f3f4f6', color: '#6b7280' },
    },
  },
  defaultVariants: {
    status: 'pending',
  },
});

export const outcomeBadge = style({
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontWeight: '500',
  marginTop: '0.5rem',
});

export const cardActions = style({
  display: 'flex',
  gap: '0.5rem',
  marginTop: '0.75rem',
  paddingTop: '0.75rem',
  borderTop: '1px solid #f3f4f6',
});

export const actionButton = recipe({
  base: {
    padding: '0.375rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flex: 1,
  },
  variants: {
    variant: {
      primary: {
        background: '#3b82f6',
        color: 'white',
        ':hover': { background: '#2563eb' },
      },
      danger: {
        background: '#ef4444',
        color: 'white',
        ':hover': { background: '#dc2626' },
      },
      secondary: {
        background: '#f3f4f6',
        color: '#6b7280',
        ':hover': { background: '#e5e7eb' },
      },
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});
