import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

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

export const staffAvatar = style({
  width: '3rem',
  height: '3rem',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '700',
  fontSize: '1.125rem',
  flexShrink: 0,
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

export const actionButton = recipe({
  base: {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
  variants: {
    variant: {
      edit: {
        background: '#f8f9fa',
        color: '#495057',
        border: '1px solid #dee2e6',
        ':hover': {
          background: '#e9ecef',
          color: '#212529',
        },
      },
      danger: {
        background: '#dc3545',
        color: 'white',
        ':hover': {
          background: '#c82333',
        },
      },
    },
  },
});
