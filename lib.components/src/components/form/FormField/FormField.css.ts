import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const section = style({
  marginBottom: vars.spacing['5'],
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const sectionHeader = style({
  marginBottom: vars.spacing['3'],
  paddingBottom: vars.spacing['2'],
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const sectionTitle = style({
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  margin: 0,
});

export const sectionDescription = style({
  marginTop: vars.spacing['1'],
  marginBottom: 0,
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
});

const baseRow = {
  display: 'grid',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['4'],
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
};

export const row = styleVariants({
  auto: {
    ...baseRow,
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  },
  single: {
    ...baseRow,
    gridTemplateColumns: '1fr',
  },
  two: {
    ...baseRow,
    gridTemplateColumns: '1fr',
    '@media': {
      '(min-width: 640px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
      },
    },
  },
  three: {
    ...baseRow,
    gridTemplateColumns: '1fr',
    '@media': {
      '(min-width: 640px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
      },
      '(min-width: 768px)': {
        gridTemplateColumns: 'repeat(3, 1fr)',
      },
    },
  },
});

export const field = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
  minWidth: 0,
});

export const fieldFullWidth = style({
  gridColumn: '1 / -1',
});

export const fieldLabel = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.secondary,
});

export const fieldLabelRequired = style({
  selectors: {
    '&::after': {
      content: ' *',
      color: vars.colors.dangerHover,
      marginLeft: vars.spacing['1'],
    },
  },
});

export const fieldDescription = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  marginTop: vars.spacing['1'],
});

export const fieldError = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.danger,
  marginTop: vars.spacing['1'],
});
