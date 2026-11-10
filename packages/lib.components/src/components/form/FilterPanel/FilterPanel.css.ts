import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

// No background, border or outer spacing of its own: SearchToolbar draws the
// single panel that holds the search field, these filters and the chips.
export const filtersContainer = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: vars.spacing['3'],
});
globalStyle(`${filtersContainer} > *`, { flex: '1 1 200px', minWidth: '160px', maxWidth: '100%' });
