import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 },
});

export const statsContainer = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '1rem',
  marginBottom: '1.5rem',
  '@media': {
    '(min-width: 768px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '(min-width: 1024px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
    },
  },
});

export const statCard = style({
  background: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  overflow: 'hidden',
});

export const loadingCard = style({
  background: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  overflow: 'hidden',
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
});

export const cardContent = style({
  padding: '1.25rem',
});

export const cardHeader = style({
  display: 'flex',
  alignItems: 'center',
});

export const iconContainer = style({
  flexShrink: 0,
});

export const icon = recipe({
  base: {
    width: '2rem',
    height: '2rem',
    borderRadius: '0.375rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  variants: {
    color: {
      blue: { background: '#dbeafe', color: '#1d4ed8' },
      yellow: { background: '#fef3c7', color: '#92400e' },
      green: { background: '#dcfce7', color: '#166534' },
      red: { background: '#fecaca', color: '#dc2626' },
      default: { background: '#f3f4f6', color: '#374151' },
    },
  },
  defaultVariants: {
    color: 'default',
  },
});

export const cardBody = style({
  marginLeft: '1.25rem',
  width: 0,
  flex: 1,
});

export const statLabel = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

export const statValue = style({
  marginTop: '0.25rem',
  fontSize: '1.5rem',
  fontWeight: '600',
  color: '#111827',
});

export const statChange = recipe({
  base: {
    marginTop: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  variants: {
    trend: {
      up: { color: '#059669' },
      down: { color: '#dc2626' },
      neutral: { color: '#6b7280' },
    },
  },
  defaultVariants: {
    trend: 'neutral',
  },
});

export const loadingIconPlaceholder = style({
  width: '2rem',
  height: '2rem',
  background: '#d1d5db',
  borderRadius: '0.375rem',
});

export const loadingTextPlaceholder = style({
  height: '1rem',
  width: '4rem',
  background: '#d1d5db',
  borderRadius: '0.25rem',
});

export const loadingValuePlaceholder = style({
  height: '1.5rem',
  width: '3rem',
  background: '#d1d5db',
  borderRadius: '0.25rem',
  marginTop: '0.5rem',
});

export const errorContainer = style({
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '0.375rem',
  padding: '1rem',
  marginBottom: '1.5rem',
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
  margin: 0,
});

export const errorMessage = style({
  fontSize: '0.875rem',
  color: '#b91c1c',
  margin: '0.25rem 0 0 0',
});
