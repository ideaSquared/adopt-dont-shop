import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const card = style({
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-2px)',
    borderColor: '#93c5fd',
  },
});

export const eventHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1rem',
});

export const eventTitle = style({
  margin: '0 0 0.5rem 0',
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
});

export const eventTypeBadge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    borderRadius: '9999px',
    whiteSpace: 'nowrap',
  },
  variants: {
    type: {
      adoption: { background: '#dbeafe', color: '#1e40af' },
      fundraising: { background: '#dcfce7', color: '#166534' },
      volunteer: { background: '#fef3c7', color: '#92400e' },
      community: { background: '#e9d5ff', color: '#6b21a8' },
      default: { background: '#f3f4f6', color: '#374151' },
    },
  },
  defaultVariants: {
    type: 'default',
  },
});

export const eventDescription = style({
  margin: '0 0 1rem 0',
  fontSize: '0.875rem',
  color: '#6b7280',
  lineHeight: '1.5',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const eventDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginBottom: '1rem',
});

export const eventDetail = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: '#6b7280',
  selectors: {
    '& span:first-child': {
      fontSize: '1rem',
    },
  },
});

export const eventFooter = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
});

export const attendanceInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: '#6b7280',
  selectors: {
    '& strong': {
      color: '#111827',
    },
  },
});
