import { style } from '@vanilla-extract/css';

export const pageContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
});

export const backLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.5rem 1rem',
  marginBottom: '2rem',
  textDecoration: 'none',
  color: '#6b7280',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '0.9rem',
  transition: 'all 0.2s ease',
  ':hover': {
    color: '#111827',
    borderColor: '#d1d5db',
    background: '#f9fafb',
  },
});

export const actionLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.75rem 1.5rem',
  textDecoration: 'none',
  borderRadius: '6px',
  fontWeight: '500',
  transition: 'all 0.2s ease',
  width: '100%',
});

export const actionLinkPrimary = style({
  background: '#6366f1',
  color: 'white',
  ':hover': {
    background: '#4f46e5',
    transform: 'translateY(-1px)',
  },
});

export const actionLinkOutline = style({
  background: 'transparent',
  color: '#111827',
  border: '1px solid #e5e7eb',
  ':hover': {
    background: '#f9fafb',
    borderColor: '#d1d5db',
  },
});

export const actionLinkLarge = style({
  padding: '1rem 2rem',
  fontSize: '1.1rem',
});

export const errorActionLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.75rem 1.5rem',
  textDecoration: 'none',
  borderRadius: '6px',
  fontWeight: '500',
  transition: 'all 0.2s ease',
  background: '#6366f1',
  color: 'white',
  ':hover': {
    background: '#4f46e5',
    transform: 'translateY(-1px)',
  },
});

export const petHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginBottom: '2rem',
  '@media': {
    '(min-width: 768px)': {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
});

export const petTitle = style({
  selectors: {
    '& h1': {
      fontSize: '2.5rem',
      fontWeight: '700',
      marginBottom: '0.5rem',
      color: '#111827',
    },
    '& .subtitle': {
      fontSize: '1.2rem',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      flexWrap: 'wrap',
    },
  },
});

export const statusSection = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
});

export const mainContent = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '2rem',
  '@media': {
    '(min-width: 768px)': {
      gridTemplateColumns: '2fr 1fr',
    },
  },
});

export const imageSection = style({
  selectors: {
    '& .primary-image': {
      width: '100%',
      height: '400px',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '1rem',
      position: 'relative',
    },
    '& .primary-image img': {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    '& .thumbnail-grid': {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gap: '0.5rem',
      maxHeight: '200px',
      overflowY: 'auto',
    },
    '& .thumbnail': {
      width: '80px',
      height: '80px',
      borderRadius: '8px',
      overflow: 'hidden',
      cursor: 'pointer',
      border: '2px solid transparent',
      transition: 'border-color 0.2s ease',
    },
    '& .thumbnail.active': {
      borderColor: '#6366f1',
    },
    '& .thumbnail:hover': {
      borderColor: '#e5e7eb',
    },
    '& .thumbnail img': {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
  },
});

export const placeholderImage = style({
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80px',
    height: '80px',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a0a0a0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    opacity: '0.3',
  },
  '::after': {
    content: '"No Photo Available"',
    position: 'absolute',
    bottom: '20px',
    fontSize: '0.9rem',
    opacity: '0.8',
    color: '#666',
  },
});

export const thumbnailPlaceholder = style({
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  '::before': {
    content: '""',
    width: '20px',
    height: '20px',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a0a0a0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    opacity: '0.3',
  },
});

export const sidebar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
});

export const infoCard = style({
  padding: '2rem',
  selectors: {
    '& h2': {
      fontSize: '1.5rem',
      fontWeight: '600',
      marginBottom: '1.5rem',
      color: '#111827',
    },
    '& .info-grid': {
      display: 'grid',
      gap: '1rem',
    },
    '& .info-item': {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 0',
      borderBottom: '1px solid #e5e7eb',
    },
    '& .info-item:last-child': {
      borderBottom: 'none',
    },
    '& .info-item .label': {
      fontWeight: '500',
      color: '#6b7280',
    },
    '& .info-item .value': {
      fontWeight: '600',
      color: '#111827',
    },
  },
});

export const actionCard = style({
  padding: '2rem',
  textAlign: 'center',
  selectors: {
    '& h3': {
      fontSize: '1.25rem',
      fontWeight: '600',
      marginBottom: '1rem',
      color: '#111827',
    },
    '& .rescue-info': {
      background: '#f9fafb',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1.5rem',
    },
    '& .rescue-info .rescue-name': {
      fontWeight: '600',
      color: '#111827',
      marginBottom: '0.25rem',
    },
    '& .rescue-info .rescue-location': {
      fontSize: '0.9rem',
      color: '#6b7280',
    },
    '& .actions': {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
  },
});

export const descriptionCard = style({
  padding: '2rem',
  gridColumn: '1 / -1',
  selectors: {
    '& h2': {
      fontSize: '1.5rem',
      fontWeight: '600',
      marginBottom: '1rem',
      color: '#111827',
    },
    '& p': {
      lineHeight: '1.6',
      color: '#6b7280',
      whiteSpace: 'pre-wrap',
    },
  },
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '400px',
  fontSize: '1.1rem',
  color: '#6b7280',
});

export const errorContainer = style({
  textAlign: 'center',
  padding: '3rem',
  color: '#ef4444',
  selectors: {
    '& h2': {
      fontSize: '1.5rem',
      marginBottom: '1rem',
    },
    '& p': {
      marginBottom: '2rem',
    },
  },
});

export const contactButton = style({
  width: '100%',
  marginTop: '0.5rem',
});
