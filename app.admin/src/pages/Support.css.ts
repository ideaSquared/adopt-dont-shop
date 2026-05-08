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
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

export const badgeSuccess = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#d1fae5',
  color: '#065f46',
});

export const badgeWarning = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fef3c7',
  color: '#92400e',
});

export const badgeDanger = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fee2e2',
  color: '#991b1b',
});

export const badgeInfo = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#dbeafe',
  color: '#1e40af',
});

export const badgeNeutral = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#f3f4f6',
  color: '#374151',
});

export const ticketInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const ticketSubject = style({
  fontWeight: '600',
  color: '#111827',
});

export const ticketMeta = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const priorityBadgeUrgent = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fee2e2',
  color: '#991b1b',
});

globalStyle(`${priorityBadgeUrgent} svg`, {
  fontSize: '0.875rem',
});

export const priorityBadgeHigh = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fed7aa',
  color: '#9a3412',
});

globalStyle(`${priorityBadgeHigh} svg`, {
  fontSize: '0.875rem',
});

export const priorityBadgeMedium = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fef3c7',
  color: '#92400e',
});

globalStyle(`${priorityBadgeMedium} svg`, {
  fontSize: '0.875rem',
});

export const priorityBadgeLow = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#e0e7ff',
  color: '#3730a3',
});

globalStyle(`${priorityBadgeLow} svg`, {
  fontSize: '0.875rem',
});

export const priorityBadgeDefault = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#f3f4f6',
  color: '#374151',
});

globalStyle(`${priorityBadgeDefault} svg`, {
  fontSize: '0.875rem',
});

export const replyCount = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: '#6b7280',
});

export const errorState = style({
  padding: '2rem',
  textAlign: 'center',
  color: '#ef4444',
});

const statIconBase = style({
  width: '48px',
  height: '48px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.5rem',
});

export const statIconRed = style([statIconBase, { background: '#ef444420', color: '#ef4444' }]);

export const statIconBlue = style([statIconBase, { background: '#3b82f620', color: '#3b82f6' }]);

export const statIconAmber = style([statIconBase, { background: '#f59e0b20', color: '#f59e0b' }]);

export const statIconGreen = style([statIconBase, { background: '#10b98120', color: '#10b981' }]);
