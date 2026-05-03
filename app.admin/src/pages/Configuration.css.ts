import { globalStyle, style } from '@vanilla-extract/css';

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const configGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
  gap: '1.5rem',
});

export const sectionCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const infoBanner = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '1rem',
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#1e40af',
  marginBottom: '1rem',
});

globalStyle(`${infoBanner} svg`, {
  flexShrink: 0,
  marginTop: '0.125rem',
});

globalStyle(`${infoBanner} a`, {
  color: '#2563eb',
  fontWeight: '600',
  textDecoration: 'none',
});

globalStyle(`${infoBanner} a:hover`, {
  textDecoration: 'underline',
});

export const gateItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: '#d1d5db',
    background: '#f9fafb',
  },
});

export const gateInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
  flex: 1,
});

export const gateName = style({
  fontWeight: '600',
  color: '#111827',
  fontSize: '0.9375rem',
});

export const gateDescription = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  lineHeight: 1.4,
});

export const gateKey = style({
  fontFamily: 'monospace',
  fontSize: '0.75rem',
  color: '#9ca3af',
  marginTop: '0.25rem',
});

export const statusBadgeEnabled = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#d1fae5',
  color: '#065f46',
});

export const statusBadgeDisabled = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#f3f4f6',
  color: '#6b7280',
});

export const settingItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
});

export const settingLabel = style({
  fontWeight: '600',
  color: '#111827',
  fontSize: '0.875rem',
});

export const settingValue = style({
  fontFamily: 'monospace',
  fontSize: '0.875rem',
  color: '#6b7280',
  padding: '0.5rem',
  background: '#f9fafb',
  borderRadius: '6px',
});

export const statsigLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: '600',
  ':hover': {
    textDecoration: 'underline',
  },
});
