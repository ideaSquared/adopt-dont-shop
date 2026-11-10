import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  width: '100%',
  padding: vars.spacing['3'],
  '@media': {
    'screen and (min-width: 768px)': {
      padding: vars.spacing['4'],
    },
  },
});

export const contentWrapper = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  '@media': {
    'screen and (min-width: 768px)': {
      gap: '1.25rem',
    },
  },
});

export const headerActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
  alignItems: 'center',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
      justifyContent: 'stretch',
    },
  },
});

export const filtersContainer = style({
  margin: 0,
});

export const statusFilterSection = style({
  marginBottom: vars.spacing['3'],
});

export const advancedFiltersSection = style({
  margin: 0,
});

export const mainContent = style({
  margin: 0,
  padding: 0,
});

export const statsContainer = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
});

export const setupCard = style({
  padding: vars.spacing['5'],
  textAlign: 'center',
  maxWidth: '600px',
  margin: `${vars.spacing['3']} auto`,
});

export const setupEmoji = style({
  fontSize: vars.typography.size['5xl'],
  marginBottom: vars.spacing['3'],
});

export const setupHint = style({
  marginBottom: vars.spacing['4'],
  color: '#6b7280',
});

export const setupActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
  justifyContent: 'center',
  flexWrap: 'wrap',
});

export const devNote = style({
  marginTop: vars.spacing['4'],
  padding: vars.spacing['3'],
  background: '#f3f4f6',
  borderRadius: vars.border.radius.base,
});

export const devNoteIntro = style({
  margin: `${vars.spacing['2']} 0`,
  fontSize: vars.typography.size.sm,
});

export const devNoteSteps = style({
  textAlign: 'left',
  fontSize: vars.typography.size.sm,
  margin: 0,
});
