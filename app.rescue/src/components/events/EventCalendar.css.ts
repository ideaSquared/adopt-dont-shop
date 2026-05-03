import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const calendarContainer = style({
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
});

export const calendarHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem',
});

export const monthTitle = style({
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
});

export const navButtons = style({
  display: 'flex',
  gap: '0.5rem',
});

export const navButton = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  background: 'white',
  color: '#111827',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f3f4f6',
  },
});

export const calendarGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '0.5rem',
});

export const dayHeader = style({
  padding: '0.75rem',
  textAlign: 'center',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
});

export const dayCell = recipe({
  base: {
    minHeight: '100px',
    padding: '0.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#eff6ff',
      borderColor: '#93c5fd',
    },
  },
  variants: {
    isToday: {
      true: {
        background: '#eff6ff',
        border: '2px solid #3b82f6',
      },
      false: {},
    },
    isCurrentMonth: {
      true: { background: 'white', opacity: 1 },
      false: { background: '#f9fafb', opacity: 0.5 },
    },
  },
});

export const dayNumber = recipe({
  base: {
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
  },
  variants: {
    isToday: {
      true: { fontWeight: '700', color: '#2563eb' },
      false: { fontWeight: '500', color: '#111827' },
    },
  },
});

export const eventDot = style({
  width: '100%',
  padding: '0.25rem 0.5rem',
  marginBottom: '0.25rem',
  borderRadius: '4px',
  fontSize: '0.625rem',
  fontWeight: '500',
  color: 'white',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  ':hover': {
    transform: 'scale(1.02)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
});

export const moreEvents = style({
  fontSize: '0.625rem',
  color: '#6b7280',
  fontWeight: '500',
  marginTop: '0.25rem',
});
