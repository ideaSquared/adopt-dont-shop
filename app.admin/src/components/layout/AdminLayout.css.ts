import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const layoutContainer = style({
  display: 'flex',
  minHeight: '100vh',
  background: '#f3f4f6',
});

export const mainContent = recipe({
  base: {
    flex: 1,
    marginTop: '80px',
    transition: 'margin-left 0.3s ease',
    minHeight: 'calc(100vh - 80px)',
  },
  variants: {
    sidebarCollapsed: {
      true: { marginLeft: '80px' },
      false: { marginLeft: '280px' },
    },
  },
});

export const contentWrapper = style({
  padding: '2rem',
  maxWidth: '1920px',
  margin: '0 auto',
  '@media': {
    '(max-width: 768px)': {
      padding: '1rem',
    },
  },
});
