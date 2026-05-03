import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

// Badge
export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  variants: {
    variant: {
      success: { background: '#d1fae5', color: '#065f46' },
      warning: { background: '#fef3c7', color: '#92400e' },
      danger: { background: '#fee2e2', color: '#991b1b' },
      info: { background: '#dbeafe', color: '#1e40af' },
      neutral: { background: '#f3f4f6', color: '#374151' },
    },
  },
});

// Stats
export const statsBar = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '1rem',
});

export const statCard = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const statIcon = recipe({
  base: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
  },
  variants: {},
});

export const statDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const statLabel = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const statValue = style({
  fontSize: '1.5rem',
  fontWeight: '700',
  color: '#111827',
});

// Filter
export const filterBar = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
});

export const filterGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  minWidth: '180px',
  flex: 1,
});

export const filterLabel = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
});

export const searchInputWrapper = style({
  position: 'relative',
  flex: 2,
  minWidth: '300px',
});

globalStyle(`${searchInputWrapper} svg`, {
  position: 'absolute',
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9ca3af',
  fontSize: '1.125rem',
});

globalStyle(`${searchInputWrapper} input`, {
  paddingLeft: '2.5rem',
});

export const select = style({
  padding: '0.625rem 0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: '#9ca3af',
  },
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
    boxShadow: `0 0 0 3px ${vars.colors.primary['100']}`,
  },
});

// Action Buttons
export const actionButtons = style({
  display: 'flex',
  gap: '0.5rem',
});

export const iconButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  background: '#ffffff',
  color: '#6b7280',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f9fafb',
    color: '#111827',
    borderColor: '#d1d5db',
  },
  ':active': {
    transform: 'scale(0.95)',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

// Page Layout
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
  margin: '0',
});

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

// Card
export const card = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
});

export const cardHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const cardTitle = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0',
});

export const cardContent = style({
  color: '#374151',
});

// Utility
export const emptyState = style({
  textAlign: 'center',
  padding: '3rem 2rem',
  color: '#6b7280',
});

export const emptyStateIcon = style({
  fontSize: '3rem',
  marginBottom: '1rem',
});

export const loadingSpinner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3rem',
  color: '#6b7280',
});
