import { globalStyle, style } from '@vanilla-extract/css';

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
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
  marginBottom: '1.5rem',
});

globalStyle(`${infoBanner} svg`, {
  flexShrink: 0,
  marginTop: '0.125rem',
});

export const tabRow = style({
  display: 'flex',
  gap: 0,
  borderBottom: '2px solid #e5e7eb',
  marginBottom: '1.5rem',
});

export const tab = style({
  padding: '0.75rem 1.5rem',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontWeight: '400',
  color: '#6b7280',
  borderBottom: '2px solid transparent',
  marginBottom: '-2px',
  textTransform: 'capitalize',
  transition: 'all 0.2s',
  ':hover': {
    color: '#2563eb',
  },
});

export const tabActive = style({
  fontWeight: '600',
  color: '#2563eb',
  borderBottomColor: '#2563eb',
});

export const roleSelector = style({
  display: 'flex',
  gap: '0.5rem',
  marginBottom: '1.5rem',
});

export const roleChip = style({
  padding: '0.5rem 1rem',
  borderRadius: '20px',
  border: '1px solid #d1d5db',
  background: 'white',
  color: '#374151',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: '500',
  textTransform: 'capitalize',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#2563eb',
  },
});

export const roleChipActive = style({
  border: '1px solid #2563eb',
  background: '#2563eb',
  color: 'white',
});

export const fieldTable = style({
  width: '100%',
  borderCollapse: 'collapse',
});

export const tableHeader = style({
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontWeight: '600',
  fontSize: '0.8rem',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e5e7eb',
});

export const tableRow = style({
  background: 'transparent',
  ':hover': {
    background: '#f9fafb',
  },
});

export const tableRowModified = style({
  background: '#fffbeb',
  ':hover': {
    background: '#fef3c7',
  },
});

export const tableCell = style({
  padding: '0.75rem 1rem',
  borderBottom: '1px solid #f3f4f6',
  fontSize: '0.875rem',
});

export const fieldName = style({
  fontFamily: "'Fira Code', 'Consolas', monospace",
  fontSize: '0.8rem',
  padding: '0.125rem 0.375rem',
  background: '#f3f4f6',
  borderRadius: '4px',
});

export const accessSelectWrite = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: '#dcfce7',
  color: '#166534',
});

export const accessSelectRead = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: '#dbeafe',
  color: '#1e40af',
});

export const accessSelectNone = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: '#fee2e2',
  color: '#991b1b',
});

export const accessSelectDefault = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: 'white',
  color: '#374151',
});

export const overrideBadge = style({
  fontSize: '0.7rem',
  padding: '0.125rem 0.5rem',
  background: '#fef3c7',
  color: '#92400e',
  borderRadius: '10px',
  fontWeight: '600',
  marginLeft: '0.5rem',
});

export const statusBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 1rem',
  background: '#f9fafb',
  borderRadius: '8px',
  marginBottom: '1rem',
  fontSize: '0.875rem',
});
