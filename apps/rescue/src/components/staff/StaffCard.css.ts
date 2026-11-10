import { style } from '@vanilla-extract/css';

export const cardContainer = style({
  background: '#f8fafc',
  border: '2px solid #e9ecef',
  borderRadius: '12px',
  padding: '1.5rem',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: '#1976d2',
    boxShadow: '0 4px 16px rgba(25, 118, 210, 0.1)',
  },
});

export const cardHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '1rem',
});

export const staffInfo = style({
  flex: 1,
});

export const staffName = style({
  margin: '0 0 0.25rem 0',
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#333',
});

export const staffTitle = style({
  margin: '0 0 0.25rem 0',
  color: '#666',
  fontWeight: '500',
});

export const staffEmail = style({
  margin: '0',
  color: '#888',
  fontSize: '0.875rem',
});

export const staffStatus = style({
  flexShrink: 0,
});

export const cardBody = style({
  marginBottom: '1rem',
});

export const staffDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const detailItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.875rem',
});

export const detailLabel = style({
  color: '#666',
  fontWeight: '500',
});

export const detailValue = style({
  color: '#333',
  fontFamily: 'monospace',
});

export const cardActions = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  paddingTop: '1rem',
  borderTop: '1px solid #e9ecef',
});
