import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const filtersContainer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  marginBottom: '2rem',
  padding: '1rem',
  background: vars.background.overlay,
  borderRadius: vars.border.radius.md,
});
globalStyle(`${filtersContainer} > *`, { flex: '1 1 300px', minWidth: '200px', maxWidth: '100%' });
