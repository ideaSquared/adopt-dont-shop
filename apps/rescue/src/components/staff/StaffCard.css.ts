import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const cardContainer = style({
  background: '#f8fafc',
  border: '2px solid #e9ecef',
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: '#1976d2',
    boxShadow: '0 4px 16px rgba(25, 118, 210, 0.1)',
  },
});

export const cardHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
});

export const staffInfo = style({
  flex: 1,
});

export const staffName = style({
  margin: `0 0 ${vars.spacing['1']} 0`,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: '#333',
});

export const staffTitle = style({
  margin: `0 0 ${vars.spacing['1']} 0`,
  color: '#666',
  fontWeight: vars.typography.weight.medium,
});

export const staffEmail = style({
  margin: '0',
  color: '#888',
  fontSize: vars.typography.size.sm,
});

export const staffStatus = style({
  flexShrink: 0,
});

export const cardBody = style({
  marginBottom: vars.spacing['3'],
});

export const staffDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const detailItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: vars.typography.size.sm,
});

export const detailLabel = style({
  color: '#666',
  fontWeight: vars.typography.weight.medium,
});

export const detailValue = style({
  color: '#333',
  fontFamily: 'monospace',
});

export const cardActions = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  paddingTop: vars.spacing['3'],
  borderTop: '1px solid #e9ecef',
});
