import { globalStyle, style } from '@vanilla-extract/css';

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const reportsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
  gap: '1.5rem',
});

export const reportCard = style({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  position: 'relative',
  ':hover': {
    borderColor: '#d1d5db',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-2px)',
  },
});

export const reportTitle = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 0.5rem 0',
});

export const reportDescription = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: '0 0 1rem 0',
  lineHeight: 1.5,
});

export const reportMeta = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
});

export const reportFrequency = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  fontSize: '0.75rem',
  color: '#6b7280',
});

globalStyle(`${reportFrequency} svg`, {
  fontSize: '0.875rem',
});

export const reportActions = style({
  display: 'flex',
  gap: '0.5rem',
});

export const scheduledReportsSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginTop: '1.5rem',
});

export const scheduledReportItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1.25rem',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  background: '#ffffff',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f9fafb',
    borderColor: '#d1d5db',
  },
});

export const scheduledReportInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  flex: 1,
});

export const scheduledReportDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const scheduledReportName = style({
  fontWeight: '600',
  color: '#111827',
  fontSize: '0.9375rem',
});

export const scheduledReportSchedule = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const scheduledReportStatus = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const lastRun = style({
  fontSize: '0.75rem',
  color: '#9ca3af',
});

export const quickStatsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '1.5rem',
});

export const quickStatCard = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const quickStatDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const quickStatLabel = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const quickStatValue = style({
  fontSize: '1.5rem',
  fontWeight: '700',
  color: '#111827',
});

export const buttonIcon = style({
  marginRight: '0.5rem',
});

export const reportList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const reportRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '12px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  textDecoration: 'none',
  color: 'inherit',
});

export const subtleSmall = style({
  color: '#6b7280',
  fontSize: '13px',
});

export const subtleScope = style({
  color: '#6b7280',
  fontSize: '12px',
});

export const templatesCard = style({
  marginTop: '16px',
});

export const templatesGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '12px',
});

export const templateCard = style({
  display: 'block',
  padding: '14px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  textDecoration: 'none',
  color: 'inherit',
});

export const templateDescription = style({
  color: '#6b7280',
  fontSize: '12px',
  marginTop: '4px',
});
