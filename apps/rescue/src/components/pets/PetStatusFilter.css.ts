import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const statusFilterContainer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['2'],
  marginBottom: 0,
});

export const visuallyHidden = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  border: 0,
  clip: 'rect(0, 0, 0, 0)',
});

export const statusCount = recipe({
  base: {
    marginLeft: vars.spacing['2'],
    padding: '0.125rem 0.375rem',
    borderRadius: vars.border.radius.lg,
    fontSize: vars.typography.size.xs,
    fontWeight: vars.typography.weight.medium,
  },
  variants: {
    active: {
      true: {
        background: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.3)',
      },
      false: {
        background: '#e5e7eb',
        color: '#6b7280',
        border: 'none',
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});
