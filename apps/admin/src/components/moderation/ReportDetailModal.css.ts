import { style } from '@vanilla-extract/css';

export const overlay = style({
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
  padding: '1rem',
});

export const modalContainer = style({
  background: '#ffffff',
  borderRadius: '12px',
  maxWidth: '700px',
  width: '100%',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
});

export const modalHeader = style({
  padding: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
});

export const headerContent = style({
  flex: 1,
});

export const title = style({
  fontSize: '1.25rem',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 0.5rem 0',
});

export const subtitle = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  padding: '0.5rem',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f3f4f6',
    color: '#111827',
  },
});

export const modalBody = style({
  padding: '1.5rem',
});

export const section = style({
  marginBottom: '1.5rem',
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const sectionTitle = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 0.75rem 0',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const infoGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem',
  '@media': {
    '(max-width: 480px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const infoItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const infoLabel = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  fontWeight: '500',
});

export const infoValue = style({
  fontSize: '0.875rem',
  color: '#111827',
  fontWeight: '500',
});

export const description = style({
  fontSize: '0.875rem',
  color: '#374151',
  lineHeight: 1.6,
  background: '#f9fafb',
  padding: '1rem',
  borderRadius: '8px',
  whiteSpace: 'pre-wrap',
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

export const badgeWarning = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: '#fef3c7',
  color: '#92400e',
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

export const entityCard = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1rem',
});

export const entityType = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  fontWeight: '500',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.5rem',
});

export const entityName = style({
  fontSize: '1rem',
  color: '#111827',
  fontWeight: '600',
  marginBottom: '0.25rem',
});

export const entityDetail = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const divider = style({
  height: '1px',
  background: '#e5e7eb',
  margin: '1.5rem 0',
});

export const viewContentButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.625rem 1rem',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  marginTop: '0.75rem',
  ':hover': {
    background: '#2563eb',
  },
  ':active': {
    transform: 'scale(0.98)',
  },
  ':disabled': {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
});

export const entityId = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  fontFamily: 'monospace',
  marginTop: '0.5rem',
  padding: '0.5rem',
  background: '#f9fafb',
  borderRadius: '4px',
  border: '1px solid #e5e7eb',
});

export const warningBox = style({
  background: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  marginTop: '0.75rem',
  fontSize: '0.875rem',
  color: '#92400e',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.5rem',
});

export const monospaceId = style({
  fontFamily: 'monospace',
  fontSize: '0.75rem',
});

export const viewContentButtonSpacing = style({
  marginTop: '1rem',
});

export const historyList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const historyItem = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const historyItemHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.5rem',
});

export const historyItemTitle = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
});

export const historyItemMeta = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const historyEmpty = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  fontStyle: 'italic',
});

export const sanctionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const sanctionItem = style({
  background: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const sanctionItemHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.5rem',
});

export const sanctionItemType = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#92400e',
});

export const sanctionItemReason = style({
  fontSize: '0.75rem',
  color: '#374151',
});

// ── EntityInspector header slot ─────────────────────────────────

export const headerInfo = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const headerBadges = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexShrink: 0,
});

export const breadcrumbWrap = style({
  padding: '0.75rem 1.25rem 0',
});

// ── Activity tab ────────────────────────────────────────────────

export const activityList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const activityItem = style({
  display: 'flex',
  gap: '0.75rem',
  padding: '0.625rem 0',
  borderBottom: '1px solid #e5e7eb',
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const activityDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#3b82f6',
  marginTop: '0.375rem',
  flexShrink: 0,
});

export const activityContent = style({
  flex: 1,
  minWidth: 0,
});

export const activityDescription = style({
  fontSize: '0.8125rem',
  color: '#111827',
  margin: 0,
});

export const activityMeta = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  margin: '0.125rem 0 0 0',
});

export const activityEmpty = style({
  padding: '2rem 1rem',
  textAlign: 'center',
  color: '#6b7280',
  fontSize: '0.875rem',
});
