import { globalStyle, style } from '@vanilla-extract/css';

export const overviewContainer = style({
  marginBottom: '2rem',
});

export const overviewCards = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '2rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const overviewDetails = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '2rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const detailSection = style({
  background: 'white',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
});

globalStyle(`${detailSection} h4`, {
  margin: '0 0 1rem 0',
  color: '#333',
  fontWeight: '600',
});

export const progressBar = style({
  width: '100%',
  height: '8px',
  backgroundColor: '#e9ecef',
  borderRadius: '4px',
  overflow: 'hidden',
  marginBottom: '0.5rem',
});

export const progressFill = style({
  height: '100%',
  background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)',
  transition: 'width 0.3s ease',
});

export const progressText = style({
  fontSize: '0.875rem',
  color: '#666',
  margin: '0',
});

export const roleList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const roleItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0',
  borderBottom: '1px solid #f0f0f0',
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const roleName = style({
  fontWeight: '500',
  color: '#333',
});

export const roleCount = style({
  background: '#e3f2fd',
  color: '#1976d2',
  padding: '0.25rem 0.75rem',
  borderRadius: '20px',
  fontSize: '0.875rem',
  fontWeight: '600',
});

export const loadingContainer = style({
  padding: '2rem',
  textAlign: 'center',
});

export const overviewSkeleton = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
});

export const emptyContainer = style({
  textAlign: 'center',
  padding: '3rem 1rem',
});

export const emptyMessage = style({
  background: '#f8f9fa',
  borderRadius: '12px',
  padding: '2rem',
  border: '2px solid #e9ecef',
});

globalStyle(`${emptyMessage} h3`, {
  margin: '0 0 0.5rem 0',
  color: '#333',
  fontWeight: '600',
});

globalStyle(`${emptyMessage} p`, {
  margin: '0',
  color: '#666',
});
