import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const detailsContainer = style({
  background: 'white',
  borderRadius: '12px',
  overflow: 'hidden',
});

export const header = style({
  padding: '2rem',
  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  borderBottom: '1px solid #e5e7eb',
});

export const headerTop = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1rem',
});

export const title = style({
  margin: '0 0 0.5rem 0',
  fontSize: '2rem',
  fontWeight: '700',
  color: '#111827',
});

export const headerActions = style({
  display: 'flex',
  gap: '0.5rem',
});

export const button = recipe({
  base: {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  variants: {
    variant: {
      primary: {
        background: '#2563eb',
        color: 'white',
        ':hover': {
          background: '#1d4ed8',
        },
      },
      secondary: {
        background: 'white',
        color: '#111827',
        border: '1px solid #d1d5db',
        ':hover': {
          background: '#f3f4f6',
        },
      },
      danger: {
        background: '#ef4444',
        color: 'white',
        ':hover': {
          background: '#dc2626',
        },
      },
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

export const metaInfo = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1.5rem',
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const metaItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  selectors: {
    '& span:first-child': {
      fontSize: '1rem',
    },
  },
});

export const body = style({
  padding: '2rem',
});

export const section = style({
  marginBottom: '2rem',
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const sectionTitle = style({
  margin: '0 0 1rem 0',
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
});

export const description = style({
  margin: 0,
  fontSize: '0.875rem',
  color: '#6b7280',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
});

export const infoGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1.5rem',
});

export const infoCard = style({
  padding: '1rem',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
});

export const infoLabel = style({
  fontSize: '0.75rem',
  fontWeight: '500',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
  marginBottom: '0.5rem',
});

export const infoValue = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#111827',
});

export const statusSelect = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  background: 'white',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
  },
});

export const progressBar = style({
  width: '100%',
  height: '8px',
  background: '#e5e7eb',
  borderRadius: '4px',
  overflow: 'hidden',
  marginTop: '0.5rem',
});

export const progressFill = style({
  height: '100%',
  background: '#2563eb',
  transition: 'width 0.3s ease',
});
