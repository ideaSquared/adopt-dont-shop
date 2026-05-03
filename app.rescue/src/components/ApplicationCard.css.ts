import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const cardContainer = style({
  background: 'white',
  borderRadius: '0.75rem',
  border: '1px solid #e5e7eb',
  padding: '1.5rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease-in-out',
  ':hover': {
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    borderColor: '#d1d5db',
  },
});

export const cardHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1rem',
  gap: '1rem',
});

export const basicInfo = style({
  flex: 1,
});

export const applicantName = style({
  margin: '0 0 0.25rem 0',
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
});

export const petName = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  marginBottom: '0.5rem',
});

export const statusBadge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    gap: '0.375rem',
  },
  variants: {
    status: {
      pending: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
      reviewing: { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
      visiting: { background: '#e0f2fe', color: '#0277bd', border: '1px solid #4fc3f7' },
      deciding: { background: '#f3e8ff', color: '#7c3aed', border: '1px solid #c4b5fd' },
      approved: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
      rejected: { background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' },
      default: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
    },
    highPriority: {
      true: { boxShadow: '0 0 0 2px #ef4444' },
      false: {},
    },
  },
  defaultVariants: {
    status: 'default',
    highPriority: false,
  },
});

export const priorityIndicator = recipe({
  base: {
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: '50%',
    flexShrink: 0,
  },
  variants: {
    priority: {
      high: { background: '#ef4444' },
      medium: { background: '#f59e0b' },
      low: { background: '#10b981' },
      default: { background: '#6b7280' },
    },
  },
  defaultVariants: {
    priority: 'default',
  },
});

export const metaInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '1rem',
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const activitySummary = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1rem',
  padding: '0.5rem',
  background: '#f9fafb',
  borderRadius: '0.375rem',
  border: '1px solid #e5e7eb',
});

export const activityIcon = recipe({
  base: {
    width: '0.75rem',
    height: '0.75rem',
    borderRadius: '50%',
    position: 'relative',
  },
  variants: {
    hasRecent: {
      true: {
        background: '#10b981',
        '::after': {
          content: "''",
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          width: '0.5rem',
          height: '0.5rem',
          background: '#ef4444',
          borderRadius: '50%',
          border: '1px solid white',
        },
      },
      false: {
        background: '#6b7280',
      },
    },
  },
  defaultVariants: {
    hasRecent: false,
  },
});

export const activityText = style({
  fontSize: '0.75rem',
  color: '#374151',
});

export const cardActions = style({
  display: 'flex',
  gap: '0.5rem',
  marginTop: '1rem',
});

export const actionButton = recipe({
  base: {
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    border: '1px solid',
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
        ':hover': {
          background: '#2563eb',
          borderColor: '#2563eb',
        },
      },
      secondary: {
        background: 'white',
        color: '#374151',
        borderColor: '#d1d5db',
        ':hover': {
          background: '#f9fafb',
          borderColor: '#9ca3af',
        },
      },
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 },
});

export const skeletonBox = style({
  background: '#f3f4f6',
  borderRadius: '0.25rem',
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
});
