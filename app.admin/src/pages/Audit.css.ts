import { globalStyle, style } from '@vanilla-extract/css';

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const logDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const logAction = style({
  fontWeight: '600',
  color: '#111827',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

globalStyle(`${logAction} svg`, {
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const logResource = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const userInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const userAvatar = style({
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontWeight: '600',
  fontSize: '0.625rem',
  flexShrink: 0,
});

export const userName = style({
  fontSize: '0.875rem',
  color: '#111827',
  fontWeight: '500',
});

export const actionIconCreate = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  background: '#d1fae5',
  color: '#065f46',
  flexShrink: 0,
});

globalStyle(`${actionIconCreate} svg`, {
  fontSize: '0.875rem',
});

export const actionIconUpdate = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  background: '#dbeafe',
  color: '#1e40af',
  flexShrink: 0,
});

globalStyle(`${actionIconUpdate} svg`, {
  fontSize: '0.875rem',
});

export const actionIconDelete = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  background: '#fee2e2',
  color: '#991b1b',
  flexShrink: 0,
});

globalStyle(`${actionIconDelete} svg`, {
  fontSize: '0.875rem',
});

export const actionIconLogin = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  background: '#fef3c7',
  color: '#92400e',
  flexShrink: 0,
});

globalStyle(`${actionIconLogin} svg`, {
  fontSize: '0.875rem',
});

export const actionIconLogout = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  background: '#f3f4f6',
  color: '#374151',
  flexShrink: 0,
});

globalStyle(`${actionIconLogout} svg`, {
  fontSize: '0.875rem',
});

export const actionIconDefault = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  background: '#e0e7ff',
  color: '#3730a3',
  flexShrink: 0,
});

globalStyle(`${actionIconDefault} svg`, {
  fontSize: '0.875rem',
});

export const changesButton = style({
  padding: '0.25rem 0.625rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  background: '#ffffff',
  color: '#6b7280',
  fontSize: '0.75rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f9fafb',
    borderColor: '#9ca3af',
  },
});

export const ipAddress = style({
  fontFamily: "'Monaco', 'Courier New', monospace",
  fontSize: '0.75rem',
  color: '#6b7280',
  background: '#f3f4f6',
  padding: '0.125rem 0.5rem',
  borderRadius: '4px',
});

export const modal = style({
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
});

export const modalContent = style({
  background: 'white',
  borderRadius: '12px',
  padding: '1.5rem',
  maxWidth: '600px',
  maxHeight: '80vh',
  overflow: 'auto',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
});

export const modalHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid #e5e7eb',
});

export const modalTitle = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
  margin: 0,
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  color: '#6b7280',
  cursor: 'pointer',
  padding: 0,
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f3f4f6',
    color: '#111827',
  },
});

export const jsonBlock = style({
  background: '#1f2937',
  color: '#f9fafb',
  padding: '1rem',
  borderRadius: '8px',
  overflow: 'auto',
  fontFamily: "'Monaco', 'Courier New', monospace",
  fontSize: '0.875rem',
  lineHeight: 1.5,
  margin: 0,
});
