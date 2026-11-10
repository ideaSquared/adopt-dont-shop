import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const subtitle = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: '0 0 1rem 0',
});

export const stageDisplay = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  margin: '1.5rem 0',
  padding: '1rem',
  background: '#f9fafb',
  borderRadius: '0.5rem',
});

export const stageBox = style({
  flex: 1,
  padding: '0.75rem',
  color: 'white',
  borderRadius: '0.375rem',
  textAlign: 'center',
  fontSize: '0.875rem',
  fontWeight: '600',
});

export const arrow = style({
  fontSize: '1.25rem',
  color: '#9ca3af',
});

export const formField = style({
  marginBottom: '1rem',
});

export const label = style({
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '0.5rem',
});

export const actionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginBottom: '1rem',
});

export const actionOption = recipe({
  base: {
    padding: '0.75rem',
    borderRadius: '0.375rem',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      borderColor: '#3b82f6',
      background: '#eff6ff',
    },
  },
  variants: {
    selected: {
      true: {
        border: '2px solid #3b82f6',
        background: '#eff6ff',
      },
      false: {
        border: '2px solid #e5e7eb',
        background: 'white',
      },
    },
  },
  defaultVariants: {
    selected: false,
  },
});

export const actionLabel = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '0.25rem',
});

export const actionDescription = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  marginTop: '1.5rem',
});

export const noActionsMessage = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  textAlign: 'center',
  padding: '1rem',
});
