import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const headerContent = style({
  flex: 1,
});

export const section = style({
  marginBottom: vars.spacing['5'],
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const sectionTitle = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
  margin: `0 0 ${vars.spacing['3']} 0`,
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
  fontWeight: vars.typography.weight.medium,
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const infoValue = style({
  fontSize: '0.9375rem',
  color: '#111827',
  wordBreak: 'break-word',
});

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
});

export const statCard = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.lg,
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const statLabel = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  fontWeight: vars.typography.weight.medium,
});

export const statValue = style({
  fontSize: vars.typography.size['3xl'],
  fontWeight: vars.typography.weight.bold,
  color: '#111827',
});

export const loadingSpinner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.spacing['6'],
  color: '#6b7280',
});

export const errorMessage = style({
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  color: '#991b1b',
  marginBottom: vars.spacing['3'],
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
  padding: vars.spacing['3'],
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  background: '#ffffff',
  ':hover': {
    background: '#f9fafb',
  },
});

export const staffInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
  flex: 1,
});

export const staffName = style({
  fontWeight: vars.typography.weight.semibold,
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
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.xs,
  color: '#9ca3af',
});

export const staffActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
});

export const inviteForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  padding: '1.25rem',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  background: '#f9fafb',
  marginBottom: vars.spacing['4'],
});

export const formRow = style({
  display: 'flex',
  gap: vars.spacing['3'],
  '@media': {
    'screen and (max-width: 640px)': {
      flexDirection: 'column',
    },
  },
});

export const formActions = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
});

export const invitationsList = style({
  marginTop: vars.spacing['5'],
});

export const invitationCard = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: vars.spacing['3'],
  border: '1px solid #fef3c7',
  borderRadius: vars.border.radius.base,
  background: '#fffbeb',
  marginBottom: '0.75rem',
});

export const skeletonRow = style({
  display: 'flex',
  gap: vars.spacing['2'],
});

export const manageLinkRow = style({
  marginTop: '0.75rem',
});

export const inviteFormSpacing = style({
  marginTop: vars.spacing['4'],
});

export const planSectionTitle = style({
  margin: `0 0 ${vars.spacing['3']}`,
  fontSize: '0.9375rem',
  color: '#111827',
});

export const staffSectionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const userPlusIcon = style({
  marginRight: vars.spacing['2'],
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
  padding: `${vars.spacing['3']} 0`,
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
  marginBottom: vars.spacing['1'],
});

export const acceptedBadge = style({
  display: 'inline-block',
  marginLeft: vars.spacing['2'],
  color: '#10b981',
});

export const staffRowFlex = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const headerSpacing = style({
  marginTop: vars.spacing['2'],
});

export const skeletonContent = style({
  padding: vars.spacing['5'],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const skeletonAvatarRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
});

export const skeletonAvatarText = style({
  flex: 1,
});

export const skeletonName = style({
  marginBottom: vars.spacing['2'],
});

// ── Actions tab (split-pane detail panel) ─────────────────────────

export const actionsSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const actionGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  alignItems: 'flex-start',
});

export const actionGroupLabel = style({
  fontSize: '0.6875rem',
  fontWeight: vars.typography.weight.semibold,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
});

export const actionButtonIcon = style({
  marginRight: vars.spacing['2'],
});

export const closeButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // WCAG 2.5.5 AA: 44x44 minimum touch target.
  minWidth: '44px',
  minHeight: '44px',
  border: 'none',
  borderRadius: vars.border.radius.base,
  background: '#f3f4f6',
  color: '#6b7280',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#e5e7eb',
    color: '#111827',
  },
});
