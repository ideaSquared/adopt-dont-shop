import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

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
  marginBottom: '1rem',
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
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${headerTitle} p`, {
  fontSize: '1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
      flexDirection: 'column',
    },
  },
});

export const filterBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  flexWrap: 'wrap',
});

export const filterSelect = style({
  padding: '0.625rem 1rem',
  background: 'white',
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: vars.text.primary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      borderColor: vars.colors.info,
    },
    '&:focus-visible': {
      outline: 'none',
      borderColor: vars.colors.info,
      boxShadow: `0 0 0 3px ${vars.colors.infoBgSubtle}`,
    },
  },
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
});

export const chartsGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '1.5rem',
  marginBottom: '2rem',
});

export const twoColumnGrid = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: '1.5rem',
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const cardHeader = style({
  padding: '1.5rem 1.5rem 1rem 1.5rem',
  borderBottom: `1px solid ${vars.border.color.default}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const cardTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

globalStyle(`${cardTitle} h3`, {
  margin: 0,
  fontSize: '1.125rem',
  fontWeight: 600,
  color: vars.text.primary,
});

globalStyle(`${cardTitle} svg`, {
  color: vars.colors.infoHover,
  fontSize: '1.25rem',
});

export const cardBody = style({
  padding: '1.5rem',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '3rem 1rem',
  color: vars.text.tertiary,
});

globalStyle(`${emptyState} svg`, {
  fontSize: '3rem',
  color: vars.border.color.muted,
  marginBottom: '1rem',
});

globalStyle(`${emptyState} h3`, {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${emptyState} p`, {
  margin: 0,
});

export const breedList = style({
  display: 'grid',
  gap: '1rem',
});

export const breedRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1rem',
  background: '#F9FAFB',
  borderRadius: '8px',
});

export const breedTitle = style({
  fontWeight: 600,
  marginBottom: '0.25rem',
});

export const breedSubtitle = style({
  fontSize: '0.875rem',
  color: '#6B7280',
});

export const breedCount = style({
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#3B82F6',
});

// Email report modal styles (matches InviteStaffModal pattern)
export const emailModalOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '2rem',
});

export const emailModalContent = style({
  background: 'white',
  borderRadius: '12px',
  maxWidth: '480px',
  width: '100%',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
});

export const emailModalHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1.5rem 1.5rem 1rem 1.5rem',
  borderBottom: '1px solid #e9ecef',
});

export const emailModalTitle = style({
  margin: 0,
  fontWeight: 600,
  color: '#333',
});

export const emailModalCloseButton = style({
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  color: '#666',
  cursor: 'pointer',
  padding: '0.5rem',
  borderRadius: '50%',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f5f5f5',
    color: '#333',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

export const emailModalForm = style({
  padding: '1.5rem',
});

export const emailModalFormGroup = style({
  marginBottom: '1.5rem',
});

export const emailModalLabel = style({
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: 600,
  color: '#333',
});

export const emailModalInput = style({
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  fontSize: '1rem',
  border: '2px solid #e9ecef',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#1976d2',
  },
  ':disabled': {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
  },
});

export const emailModalError = style({
  display: 'block',
  color: '#dc3545',
  fontSize: '0.875rem',
  marginTop: '0.25rem',
});

export const emailModalActions = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  paddingTop: '1rem',
  borderTop: '1px solid #e9ecef',
});

export const emailModalCancelButton = style({
  padding: '0.75rem 1.5rem',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: 500,
  cursor: 'pointer',
  background: '#f8f9fa',
  color: '#495057',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover:not(:disabled)': {
      background: '#e9ecef',
    },
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

export const emailModalSubmitButton = style({
  padding: '0.75rem 1.5rem',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: 500,
  cursor: 'pointer',
  background: '#1976d2',
  color: 'white',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover:not(:disabled)': {
      background: '#1565c0',
    },
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});
