import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const pageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '1rem',
});

export const headerLeft = style({});

globalStyle(`${headerLeft} h1`, {
  fontSize: '2rem',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 0.5rem 0',
});

globalStyle(`${headerLeft} p`, {
  fontSize: '1rem',
  color: '#6b7280',
  margin: 0,
});

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const tabBar = style({
  display: 'flex',
  gap: 0,
  borderBottom: '2px solid #e5e7eb',
});

export const tab = style({
  padding: '0.75rem 1.5rem',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  marginBottom: '-2px',
  color: '#6b7280',
  fontWeight: '400',
  fontSize: '0.875rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
});

export const tabActive = style({
  borderBottomColor: '#2563eb',
  color: '#2563eb',
  fontWeight: '600',
});

export const card = style({
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
});

export const filterBar = style({
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
});

export const filterGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  minWidth: '160px',
});

export const filterLabel = style({
  fontSize: '0.8rem',
  fontWeight: '500',
  color: '#374151',
});

export const select = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
});

export const searchWrapper = style({
  position: 'relative',
  flex: 2,
  minWidth: '220px',
});

globalStyle(`${searchWrapper} svg`, {
  position: 'absolute',
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9ca3af',
});

export const searchInput = style({
  width: '100%',
  padding: '0.5rem 0.75rem 0.5rem 2.25rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '1rem',
});

export const th = style({
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
  borderBottom: '1px solid #e5e7eb',
  background: '#f9fafb',
});

export const td = style({
  padding: '0.875rem 1rem',
  borderBottom: '1px solid #f3f4f6',
  fontSize: '0.875rem',
  color: '#374151',
  verticalAlign: 'middle',
});

export const statusBadgePublished = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '500',
  background: '#d1fae5',
  color: '#065f46',
});

export const statusBadgeDraft = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '500',
  background: '#fef3c7',
  color: '#92400e',
});

export const statusBadgeScheduled = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '500',
  background: '#dbeafe',
  color: '#1e40af',
});

export const statusBadgeDefault = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '500',
  background: '#f3f4f6',
  color: '#374151',
});

export const actionGroup = style({
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
});

export const iconButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.375rem',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#6b7280',
  cursor: 'pointer',
  ':hover': {
    opacity: 0.8,
  },
});

export const iconButtonPrimary = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.375rem',
  borderRadius: '6px',
  border: '1px solid #93c5fd',
  background: '#eff6ff',
  color: '#2563eb',
  cursor: 'pointer',
  ':hover': {
    opacity: 0.8,
  },
});

export const iconButtonDanger = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.375rem',
  borderRadius: '6px',
  border: '1px solid #fca5a5',
  background: '#fef2f2',
  color: '#dc2626',
  cursor: 'pointer',
  ':hover': {
    opacity: 0.8,
  },
});

export const primaryButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.625rem 1.25rem',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  ':hover': {
    background: '#1d4ed8',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

export const overlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
});

export const modal = style({
  background: '#fff',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '760px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
});

export const modalHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

globalStyle(`${modalHeader} h2`, {
  margin: 0,
  fontSize: '1.25rem',
  color: '#111827',
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  cursor: 'pointer',
  color: '#6b7280',
  lineHeight: 1,
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  '@media': {
    'screen and (max-width: 600px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
});

export const formGroupFull = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  gridColumn: '1 / -1',
});

export const formLabel = style({
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#374151',
});

export const formInput = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  ':focus': {
    outline: 'none',
    borderColor: '#2563eb',
  },
  ':disabled': {
    background: '#f9fafb',
    color: '#9ca3af',
  },
});

export const formTextarea = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  resize: 'vertical',
  minHeight: '200px',
  fontFamily: 'monospace',
  ':focus': {
    outline: 'none',
    borderColor: '#2563eb',
  },
});

export const formSelect = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  background: '#fff',
});

export const modalActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  paddingTop: '0.5rem',
  borderTop: '1px solid #e5e7eb',
});

export const secondaryButton = style({
  padding: '0.625rem 1.25rem',
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#374151',
  borderRadius: '8px',
  fontSize: '0.875rem',
  cursor: 'pointer',
});

export const emptyState = style({
  padding: '3rem',
  textAlign: 'center',
  color: '#9ca3af',
  fontSize: '0.95rem',
});

export const errorMessage = style({
  color: '#dc2626',
  fontSize: '0.875rem',
  margin: 0,
});

export const seoSection = style({
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1rem',
  background: '#f9fafb',
  gridColumn: '1 / -1',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const seoTitle = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
  margin: 0,
});
