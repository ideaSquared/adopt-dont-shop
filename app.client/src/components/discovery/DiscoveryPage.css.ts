import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const pageContainer = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  padding: '1rem 0',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem',
  padding: '0 1rem',
});

export const title = style({
  fontSize: '2rem',
  fontWeight: 700,
  color: '#333',
  margin: 0,
});

export const headerActions = style({
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
});

export const filterButton = recipe({
  base: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    background: '#f8f9fa',
    color: '#333',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#e9ecef',
    },
  },
  variants: {
    active: {
      true: {
        background: '#4ecdc4',
        color: 'white',
        borderColor: '#4ecdc4',
      },
      false: {},
    },
  },
  defaultVariants: { active: false },
});

export const actionLinkPrimary = style({
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 500,
  transition: 'all 0.2s ease',
  background: '#4ecdc4',
  color: 'white',
  ':hover': {
    background: '#45b7b8',
  },
});

export const actionLinkSecondary = style({
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 500,
  transition: 'all 0.2s ease',
  background: '#f8f9fa',
  color: '#333',
  border: '1px solid #dee2e6',
  ':hover': {
    background: '#e9ecef',
  },
});

export const mainContent = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
});

export const filtersPanel = recipe({
  base: {
    marginBottom: '1rem',
    overflow: 'hidden',
    background: '#f8f9fa',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    width: '100%',
    maxWidth: '600px',
  },
  variants: {
    isOpen: {
      true: {
        padding: '1rem',
        maxHeight: '200px',
      },
      false: {
        padding: 0,
        maxHeight: 0,
      },
    },
  },
  defaultVariants: { isOpen: false },
});

export const filterGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
});

export const filterGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  selectors: {
    '& label': {
      fontWeight: 500,
      color: '#333',
      fontSize: '0.9rem',
    },
    '& select': {
      padding: '0.5rem',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      fontSize: '0.9rem',
    },
    '& input': {
      padding: '0.5rem',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      fontSize: '0.9rem',
    },
    '& select:focus': {
      outline: 'none',
      borderColor: '#4ecdc4',
    },
    '& input:focus': {
      outline: 'none',
      borderColor: '#4ecdc4',
    },
  },
});

export const sessionStats = style({
  marginTop: '2rem',
  padding: '1rem',
  background: '#f8f9fa',
  borderRadius: '12px',
  textAlign: 'center',
  color: '#666',
  fontSize: '0.9rem',
});

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '1rem',
  marginTop: '0.5rem',
});

export const statItem = style({
  textAlign: 'center',
});

export const statNumber = style({
  fontSize: '1.2rem',
  fontWeight: 700,
  color: '#333',
});

export const statLabel = style({
  fontSize: '0.8rem',
  marginTop: '0.25rem',
});

export const loadingState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '400px',
  color: '#666',
});

export const spinner = style({
  width: '40px',
  height: '40px',
  border: '3px solid #f3f3f3',
  borderTop: '3px solid #4ecdc4',
  borderRadius: '50%',
  animationName: 'spin',
  animationDuration: '1s',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
  marginBottom: '1rem',
});

export const errorState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '400px',
  padding: '2rem',
  textAlign: 'center',
});

export const errorIcon = style({
  fontSize: '3rem',
  marginBottom: '1rem',
  opacity: 0.5,
});

export const errorMessageText = style({
  color: '#e74c3c',
  marginBottom: '1rem',
  fontWeight: 500,
});

export const retryButton = style({
  padding: '0.5rem 1rem',
  background: '#4ecdc4',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 500,
  ':hover': {
    background: '#45b7b8',
  },
});
