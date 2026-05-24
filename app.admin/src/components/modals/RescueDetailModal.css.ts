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
  borderRadius: '16px',
  width: '100%',
  maxWidth: '900px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
});

export const modalHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
});

export const headerContent = style({
  flex: 1,
});

export const closeButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // WCAG 2.5.5 AA: 44x44 minimum touch target.
  minWidth: '44px',
  minHeight: '44px',
  border: 'none',
  borderRadius: '8px',
  background: '#f3f4f6',
  color: '#6b7280',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#e5e7eb',
    color: '#111827',
  },
});

export const modalBody = style({
  flex: 1,
  overflowY: 'auto',
  padding: '1.5rem',
});

export const tabContainer = style({
  display: 'flex',
  gap: '0.5rem',
  borderBottom: '2px solid #e5e7eb',
  marginBottom: '1.5rem',
});

export const tab = style({
  padding: '0.75rem 1.25rem',
  border: 'none',
  background: 'none',
  color: '#6b7280',
  fontWeight: '500',
  fontSize: '0.875rem',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  marginBottom: '-2px',
  transition: 'all 0.2s ease',
  ':hover': {
    color: '#667eea',
  },
});

export const tabActive = style({
  color: '#667eea',
  fontWeight: '600',
  borderBottom: '2px solid #667eea',
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
  fontSize: '1rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 1rem 0',
});

export const infoGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1.25rem',
});

export const infoItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
});

export const infoLabel = style({
  fontSize: '0.8125rem',
  fontWeight: '500',
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const infoValue = style({
  fontSize: '0.9375rem',
  color: '#111827',
  wordBreak: 'break-word',
});

export const badgeSuccess = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.375rem 0.875rem',
  borderRadius: '9999px',
  fontSize: '0.8125rem',
  fontWeight: '600',
  background: '#d1fae5',
  color: '#065f46',
});

export const badgeWarning = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.375rem 0.875rem',
  borderRadius: '9999px',
  fontSize: '0.8125rem',
  fontWeight: '600',
  background: '#fef3c7',
  color: '#92400e',
});

export const badgeDanger = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.375rem 0.875rem',
  borderRadius: '9999px',
  fontSize: '0.8125rem',
  fontWeight: '600',
  background: '#fee2e2',
  color: '#991b1b',
});

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
});

export const statCard = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const statLabel = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  fontWeight: '500',
});

export const statValue = style({
  fontSize: '1.875rem',
  fontWeight: '700',
  color: '#111827',
});

export const loadingSpinner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3rem',
  color: '#6b7280',
});

export const errorMessage = style({
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '1rem',
  color: '#991b1b',
  marginBottom: '1rem',
});

export const staffList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const staffCard = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  background: '#ffffff',
  ':hover': {
    background: '#f9fafb',
  },
});

export const staffInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  flex: 1,
});

export const staffName = style({
  fontWeight: '600',
  color: '#111827',
  fontSize: '0.9375rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '100%',
});

export const staffEmail = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const staffMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.75rem',
  color: '#9ca3af',
});

export const staffActions = style({
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
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const inviteForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  padding: '1.25rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  background: '#f9fafb',
  marginBottom: '1.5rem',
});

export const formRow = style({
  display: 'flex',
  gap: '1rem',
  '@media': {
    'screen and (max-width: 640px)': {
      flexDirection: 'column',
    },
  },
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
  flex: 1,
});

export const label = style({
  fontSize: '0.8125rem',
  fontWeight: '500',
  color: '#374151',
});

export const input = style({
  padding: '0.625rem 0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  ':focus-visible': {
    outline: 'none',
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

export const formActions = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
});

export const invitationsList = style({
  marginTop: '2rem',
});

export const invitationCard = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem',
  border: '1px solid #fef3c7',
  borderRadius: '8px',
  background: '#fffbeb',
  marginBottom: '0.75rem',
});

export const invitationBadgePending = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fef3c7',
  color: '#92400e',
});

export const invitationBadgeDefault = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#e5e7eb',
  color: '#374151',
});

export const skeletonRow = style({
  display: 'flex',
  gap: '0.5rem',
});

export const tableWrapper = style({
  overflowX: 'auto',
});

export const dataTable = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
});

export const tableHeadRow = style({
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
});

export const tableCell = style({
  padding: '0.5rem',
});

export const tableBodyRow = style({
  borderBottom: '1px solid #f3f4f6',
});

export const manageLinkRow = style({
  marginTop: '0.75rem',
});

export const inviteFormSpacing = style({
  marginTop: '1.5rem',
});

export const planSectionTitle = style({
  margin: '0 0 1rem',
  fontSize: '0.9375rem',
  color: '#111827',
});

export const errorMessageSpacing = style({
  marginBottom: '1rem',
});

export const staffSectionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const userPlusIcon = style({
  marginRight: '0.5rem',
});

export const staffSectionSubtitle = style({
  margin: 0,
  fontSize: '0.9375rem',
  color: '#111827',
});

export const skeletonStaffList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  padding: '1rem 0',
});

export const skeletonStaffRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const skeletonStaffText = style({
  flex: 1,
});

export const skeletonStaffName = style({
  marginBottom: '0.25rem',
});

export const acceptedBadge = style({
  display: 'inline-block',
  marginLeft: '0.5rem',
  color: '#10b981',
});

export const staffRowFlex = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const headerSpacing = style({
  marginTop: '0.5rem',
});

export const skeletonContent = style({
  padding: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const skeletonAvatarRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const skeletonAvatarText = style({
  flex: 1,
});

export const skeletonName = style({
  marginBottom: '0.5rem',
});

export const modalFooter = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  padding: '1.25rem 1.5rem',
  borderTop: '1px solid #e5e7eb',
});

export const successMessage = style({
  padding: '0.75rem',
  marginBottom: '1rem',
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '0.375rem',
  color: '#166534',
  fontSize: '0.875rem',
});
