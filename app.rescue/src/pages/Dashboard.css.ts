import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const dashboardContainer = style({
  maxWidth: 'none',
  margin: 0,
  width: '100%',
  padding: 0,
});

export const dashboardHeader = style({
  marginBottom: '2rem',
});

globalStyle(`${dashboardHeader} h1`, {
  fontSize: '2.5rem',
  fontWeight: 700,
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${dashboardHeader} p`, {
  fontSize: '1.1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const welcomeMessage = style({
  background: `linear-gradient(135deg, ${vars.colors.infoBgSubtle} 0%, ${vars.colors.infoBgSubtle} 100%)`,
  border: `1px solid ${vars.colors.infoBorderSubtle}`,
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '2rem',
});

globalStyle(`${welcomeMessage} h2`, {
  margin: '0 0 0.5rem 0',
  color: vars.colors.infoTextEmphasis,
  fontSize: '1.25rem',
});

globalStyle(`${welcomeMessage} p`, {
  margin: 0,
  color: vars.colors.infoActive,
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
  width: '100%',
});

export const analyticsGrid = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr',
  gap: '1.5rem',
  marginBottom: '2rem',
  width: '100%',
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const loadingState = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '200px',
});

export const errorCard = style({
  padding: '1.5rem',
  textAlign: 'center',
});

export const errorMessage = style({
  color: '#ef4444',
  marginBottom: '1rem',
});

export const errorHint = style({
  color: '#6b7280',
  marginBottom: '1rem',
});

export const errorActions = style({
  display: 'flex',
  justifyContent: 'center',
  gap: '1rem',
  marginTop: '1rem',
});

export const refreshButton = style({
  backgroundColor: '#3b82f6',
  color: 'white',
  padding: '0.5rem 1rem',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
});

export const clearAuthButton = style({
  backgroundColor: '#ef4444',
  color: 'white',
  padding: '0.5rem 1rem',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
});

export const metricCardBody = style({
  padding: '1.5rem',
});

export const metricCardHeader = style({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const metricEmoji = style({
  fontSize: '1.5rem',
  marginRight: '0.75rem',
});

export const metricLabel = style({
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
});

export const metricValue = style({
  fontSize: '2.25rem',
  fontWeight: 700,
  marginBottom: '0.5rem',
});

export const metricDeltaUp = style({
  fontSize: '0.875rem',
  color: '#10b981',
});

export const metricDeltaDown = style({
  fontSize: '0.875rem',
  color: '#ef4444',
});

export const cardSectionHeader = style({
  padding: '1.5rem 1.5rem 1rem 1.5rem',
  borderBottom: '1px solid #e5e7eb',
});

export const cardSectionHeading = style({
  margin: 0,
});

export const cardSectionBody = style({
  padding: '1.5rem',
});

export const chartArea = style({
  display: 'flex',
  alignItems: 'end',
  height: '180px',
  gap: '0.5rem',
  marginBottom: '1rem',
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
  borderRadius: '4px 4px 0 0',
  width: '100%',
  minHeight: '4px',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
});

export const chartMonthLabel = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  marginTop: '0.5rem',
  fontWeight: 500,
});

export const chartValueLabel = style({
  fontSize: '0.875rem',
  fontWeight: 600,
  marginTop: '0.25rem',
});

export const chartSummary = style({
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
  fontSize: '0.875rem',
});

export const chartSummaryRow = style({
  margin: '0.25rem 0',
  color: '#4b5563',
});

export const statusList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
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
  fontWeight: 500,
});

export const statusValueChip = style({
  fontWeight: 600,
  backgroundColor: '#f3f4f6',
  padding: '0.25rem 0.75rem',
  borderRadius: '12px',
  fontSize: '0.875rem',
});

export const activityList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const activityItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid #e5e7eb',
});

export const activityItemLast = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  paddingBottom: '0',
  borderBottom: 'none',
});

export const activityTimestamp = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  fontWeight: 500,
});

export const activityMessage = style({
  fontSize: '0.875rem',
  lineHeight: 1.4,
});

export const emptyActivityMessage = style({
  fontSize: '0.875rem',
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
  gap: '0.5rem',
});

export const unreadBadge = style({
  backgroundColor: '#ef4444',
  color: 'white',
  fontSize: '0.75rem',
  fontWeight: 600,
  padding: '0.25rem 0.5rem',
  borderRadius: '10px',
  minWidth: '1.25rem',
  textAlign: 'center',
});

export const notificationsBody = style({
  padding: '1rem',
});

export const notificationRowBase = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '0.75rem',
  borderRadius: '8px',
  marginBottom: '0.5rem',
  position: 'relative',
});

export const notificationRowRead = style({
  backgroundColor: '#f9fafb',
});

export const notificationRowUnread = style({
  backgroundColor: '#eff6ff',
});

export const notificationIcon = style({
  fontSize: '1.25rem',
  marginTop: '0.125rem',
});

export const notificationContent = style({
  flex: 1,
});

export const notificationTitle = style({
  fontWeight: 600,
  fontSize: '0.875rem',
  marginBottom: '0.25rem',
});

export const notificationBody = style({
  color: '#4b5563',
  fontSize: '0.875rem',
  lineHeight: 1.4,
  marginBottom: '0.25rem',
});

export const notificationTimestamp = style({
  color: '#6b7280',
  fontSize: '0.75rem',
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
  padding: '2rem',
});

export const notificationsFooter = style({
  padding: '1rem 1.5rem',
  borderTop: '1px solid #e5e7eb',
  textAlign: 'center',
});

export const viewAllButton = style({
  background: 'none',
  border: '1px solid #d1d5db',
  color: '#374151',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.2s ease',
});
