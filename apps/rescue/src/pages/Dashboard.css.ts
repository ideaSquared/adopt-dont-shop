import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const dashboardContainer = style({
  maxWidth: 'none',
  margin: 0,
  width: '100%',
  padding: 0,
});

export const welcomeMessage = style({
  background: `linear-gradient(135deg, ${vars.colors.infoBgSubtle} 0%, ${vars.colors.infoBgSubtle} 100%)`,
  border: `1px solid ${vars.colors.infoBorderSubtle}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  marginBottom: vars.spacing['5'],
});

globalStyle(`${welcomeMessage} h2`, {
  margin: `0 0 ${vars.spacing['2']} 0`,
  color: vars.colors.infoTextEmphasis,
  fontSize: vars.typography.size.xl,
});

globalStyle(`${welcomeMessage} p`, {
  margin: 0,
  color: vars.colors.infoActive,
});

export const onboardingBanner = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.spacing['3'],
  background: `linear-gradient(135deg, ${vars.colors.successBgSubtle} 0%, ${vars.colors.infoBgSubtle} 100%)`,
  border: `1px solid ${vars.colors.successBorderSubtle}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  marginBottom: vars.spacing['5'],
});

export const onboardingContent = style({
  flex: 1,
});

export const onboardingTitle = style({
  margin: `0 0 ${vars.spacing['2']} 0`,
  fontSize: '1.1rem',
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const onboardingText = style({
  margin: `0 0 ${vars.spacing['3']} 0`,
  color: vars.text.secondary,
  fontSize: '0.95rem',
});

export const onboardingActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
  flexWrap: 'wrap',
});

export const onboardingLink = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  background: vars.colors.info,
  color: 'white',
  borderRadius: vars.border.radius.base,
  textDecoration: 'none',
  fontWeight: vars.typography.weight.medium,
  fontSize: vars.typography.size.sm,
  transition: 'background 0.2s ease',
  selectors: {
    '&:hover': {
      background: vars.colors.infoHover,
    },
  },
});

export const onboardingDismiss = style({
  background: 'none',
  border: 'none',
  fontSize: vars.typography.size.xl,
  color: vars.text.tertiary,
  cursor: 'pointer',
  padding: vars.spacing['1'],
  lineHeight: 1,
  borderRadius: vars.border.radius.sm,
  transition: 'color 0.2s ease',
  ':hover': {
    color: vars.text.primary,
  },
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['5'],
  width: '100%',
});

export const analyticsGrid = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['5'],
  width: '100%',
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const errorCard = style({
  padding: vars.spacing['4'],
  textAlign: 'center',
});

export const errorHint = style({
  color: '#6b7280',
  marginBottom: vars.spacing['3'],
});

export const errorActions = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.spacing['3'],
  marginTop: vars.spacing['3'],
});

export const cardSectionHeader = style({
  padding: `${vars.spacing['4']} ${vars.spacing['4']} ${vars.spacing['3']} ${vars.spacing['4']}`,
  borderBottom: '1px solid #e5e7eb',
});

export const cardSectionHeading = style({
  margin: 0,
});

export const cardSectionBody = style({
  padding: vars.spacing['4'],
});

export const chartArea = style({
  display: 'flex',
  alignItems: 'end',
  height: '180px',
  gap: vars.spacing['2'],
  marginBottom: vars.spacing['3'],
});

export const chartColumn = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100%',
});

export const chartBar = style({
  background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
  borderRadius: `${vars.border.radius.sm} ${vars.border.radius.sm} 0 0`,
  width: '100%',
  minHeight: '4px',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
});

export const chartMonthLabel = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  marginTop: vars.spacing['2'],
  fontWeight: vars.typography.weight.medium,
});

export const chartValueLabel = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  marginTop: vars.spacing['1'],
});

export const chartSummary = style({
  paddingTop: vars.spacing['3'],
  borderTop: '1px solid #e5e7eb',
  fontSize: vars.typography.size.sm,
});

export const chartSummaryRow = style({
  margin: `${vars.spacing['1']} 0`,
  color: '#4b5563',
});

export const statusList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const statusRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const statusLabelWrap = style({
  display: 'flex',
  alignItems: 'center',
});

export const statusDot = style({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  marginRight: '0.75rem',
});

export const statusName = style({
  fontWeight: vars.typography.weight.medium,
});

export const statusValueChip = style({
  fontWeight: vars.typography.weight.semibold,
  backgroundColor: '#f3f4f6',
  padding: '0.25rem 0.75rem',
  borderRadius: vars.border.radius.lg,
  fontSize: vars.typography.size.sm,
});

export const activityList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const activityItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
  paddingBottom: vars.spacing['3'],
  borderBottom: '1px solid #e5e7eb',
});

export const activityItemLast = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
  paddingBottom: '0',
  borderBottom: 'none',
});

export const activityTimestamp = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  fontWeight: vars.typography.weight.medium,
});

export const activityMessage = style({
  fontSize: vars.typography.size.sm,
  lineHeight: 1.4,
});

export const emptyActivityMessage = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  textAlign: 'center',
});

export const notificationsCard = style({
  gridColumn: '1 / -1',
});

export const notificationsHeading = style({
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const unreadBadge = style({
  backgroundColor: '#ef4444',
  color: 'white',
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  borderRadius: '10px',
  minWidth: '1.25rem',
  textAlign: 'center',
});

export const notificationsBody = style({
  padding: vars.spacing['3'],
});

export const notificationRowBase = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '0.75rem',
  borderRadius: vars.border.radius.base,
  marginBottom: vars.spacing['2'],
  position: 'relative',
});

export const notificationRowRead = style({
  backgroundColor: '#f9fafb',
});

export const notificationRowUnread = style({
  backgroundColor: '#eff6ff',
});

export const notificationIcon = style({
  fontSize: vars.typography.size.xl,
  marginTop: '0.125rem',
});

export const notificationContent = style({
  flex: 1,
});

export const notificationTitle = style({
  fontWeight: vars.typography.weight.semibold,
  fontSize: vars.typography.size.sm,
  marginBottom: vars.spacing['1'],
});

export const notificationBody = style({
  color: '#4b5563',
  fontSize: vars.typography.size.sm,
  lineHeight: 1.4,
  marginBottom: vars.spacing['1'],
});

export const notificationTimestamp = style({
  color: '#6b7280',
  fontSize: vars.typography.size.xs,
});

export const unreadDot = style({
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
  width: '8px',
  height: '8px',
  backgroundColor: '#3b82f6',
  borderRadius: '50%',
});

export const emptyNotifications = style({
  color: '#6b7280',
  textAlign: 'center',
  padding: vars.spacing['5'],
});

export const notificationsFooter = style({
  padding: `${vars.spacing['3']} ${vars.spacing['4']}`,
  borderTop: '1px solid #e5e7eb',
  textAlign: 'center',
});
