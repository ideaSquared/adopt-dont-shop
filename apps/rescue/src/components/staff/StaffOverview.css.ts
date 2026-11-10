import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const overviewContainer = style({
  marginBottom: vars.spacing['5'],
});

export const overviewCards = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['5'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const overviewDetails = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: vars.spacing['5'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const detailSection = style({
  background: 'white',
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
});

globalStyle(`${detailSection} h4`, {
  margin: `0 0 ${vars.spacing['3']} 0`,
  color: '#333',
  fontWeight: vars.typography.weight.semibold,
});

export const progressBar = style({
  width: '100%',
  height: '8px',
  backgroundColor: '#e9ecef',
  borderRadius: vars.border.radius.sm,
  overflow: 'hidden',
  marginBottom: vars.spacing['2'],
});

export const progressFill = style({
  height: '100%',
  background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)',
  transition: 'width 0.3s ease',
});

export const progressText = style({
  fontSize: vars.typography.size.sm,
  color: '#666',
  margin: '0',
});

export const roleList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const roleItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${vars.spacing['2']} 0`,
  borderBottom: '1px solid #f0f0f0',
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const roleName = style({
  fontWeight: vars.typography.weight.medium,
  color: '#333',
});

export const roleCount = style({
  background: '#e3f2fd',
  color: '#1976d2',
  padding: '0.25rem 0.75rem',
  borderRadius: '20px',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
});

export const loadingContainer = style({
  padding: vars.spacing['5'],
  textAlign: 'center',
});

export const overviewSkeleton = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
});

export const emptyContainer = style({
  textAlign: 'center',
  padding: `${vars.spacing['6']} ${vars.spacing['3']}`,
});

export const emptyMessage = style({
  background: '#f8f9fa',
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['5'],
  border: '2px solid #e9ecef',
});

globalStyle(`${emptyMessage} h3`, {
  margin: `0 0 ${vars.spacing['2']} 0`,
  color: '#333',
  fontWeight: vars.typography.weight.semibold,
});

globalStyle(`${emptyMessage} p`, {
  margin: '0',
  color: '#666',
});
