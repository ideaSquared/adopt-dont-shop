import { style } from '@vanilla-extract/css';

export const helperText = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  lineHeight: 1.4,
  selectors: {
    '& strong': {
      color: '#374151',
    },
  },
});
