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
  fontWeight: '600',
  color: '#374151',
});

export const select = style({
  padding: '0.625rem 1rem',
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
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const searchWrapper = style({
  position: 'relative',
  flex: 2,
  minWidth: '250px',
});

export const searchIcon = style({
  position: 'absolute',
  left: '1rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9ca3af',
  pointerEvents: 'none',
});

export const badgeSuccess = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: '#dcfce7',
  color: '#15803d',
});

export const badgeDanger = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: '#fee2e2',
  color: '#dc2626',
});

export const badgeInfo = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: '#dbeafe',
  color: '#1e40af',
});

export const badgeNeutral = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: '#f3f4f6',
  color: '#4b5563',
});

export const priorityIndicatorCritical = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#dc2626',
  flexShrink: 0,
});

export const priorityIndicatorHigh = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#ea580c',
  flexShrink: 0,
});

export const priorityIndicatorMedium = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#ca8a04',
  flexShrink: 0,
});

export const priorityIndicatorLow = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#2563eb',
  flexShrink: 0,
});

export const priorityIndicatorDefault = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#9ca3af',
  flexShrink: 0,
});

export const priorityLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: '#374151',
});

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
});

export const contentTypeTagPet = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#ede9fe',
  color: '#6b21a8',
});

export const contentTypeTagMessage = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#dbeafe',
  color: '#1e40af',
});

export const contentTypeTagUser = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fce7f3',
  color: '#9f1239',
});

export const contentTypeTagRescue = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fef3c7',
  color: '#92400e',
});

export const contentTypeTagDefault = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#f3f4f6',
  color: '#374151',
});
