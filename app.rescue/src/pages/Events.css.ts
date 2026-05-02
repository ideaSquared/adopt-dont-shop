import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  maxWidth: '100%',
  margin: 0,
  padding: 0,
});

export const pageHeader = style({
  marginBottom: '2rem',
});

export const headerTop = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1.5rem',
  gap: '1rem',
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },
});

export const headerTitle = style({});

globalStyle(`${headerTitle} h1`, {
  fontSize: '2rem',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 0.5rem 0',
});

globalStyle(`${headerTitle} p`, {
  fontSize: '1rem',
  color: '#6b7280',
  margin: 0,
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
    },
  },
});

export const primaryButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.5rem',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      background: '#1d4ed8',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&:focus': {
      outline: 'none',
      boxShadow: '0 0 0 3px #dbeafe',
    },
    '&:disabled': {
      background: '#d1d5db',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none',
    },
  },
});

globalStyle(`${primaryButton} svg`, {
  fontSize: '1.125rem',
});

export const contentArea = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const errorState = style({
  textAlign: 'center',
  padding: '2rem',
  color: '#dc2626',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  marginBottom: '1.5rem',
});

globalStyle(`${errorState} p`, {
  margin: 0,
});

export const modal = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1000,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
  overflowY: 'auto',
});

export const modalOpen = style({
  display: 'flex',
});

export const modalClosed = style({
  display: 'none',
});

export const modalContent = style({
  background: 'white',
  borderRadius: '12px',
  maxWidth: '900px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  position: 'relative',
  margin: '2rem auto',
});

export const modalHeader = style({
  position: 'sticky',
  top: 0,
  background: 'white',
  padding: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  zIndex: 10,
  borderRadius: '12px 12px 0 0',
});

export const modalTitle = style({
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: 600,
  color: '#111827',
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  color: '#6b7280',
  cursor: 'pointer',
  padding: '0.25rem',
  lineHeight: 1,
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      color: '#111827',
    },
  },
});

export const modalBody = style({
  padding: '1.5rem',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '3rem 1rem',
  color: '#6b7280',
});

globalStyle(`${emptyState} svg`, {
  fontSize: '3rem',
  color: '#d1d5db',
  marginBottom: '1rem',
});

globalStyle(`${emptyState} h3`, {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: '#111827',
  margin: '0 0 0.5rem 0',
});

globalStyle(`${emptyState} p`, {
  margin: '0 0 1.5rem 0',
});
