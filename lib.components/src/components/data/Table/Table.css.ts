import { globalStyle, keyframes, style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '../../../styles/theme.css';

export const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 },
});

export const tableContainer = recipe({
  base: {
    position: 'relative',
    background: vars.background.secondary,
    borderRadius: vars.border.radius.lg,

    selectors: {
      '&::-webkit-scrollbar': {
        height: '6px',
        width: '6px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        background: vars.border.color.tertiary,
        borderRadius: '3px',
      },
      '&::-webkit-scrollbar-thumb:hover': {
        background: vars.border.color.quaternary,
      },
    },
  },
  variants: {
    responsive: {
      true: {
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      },
      false: {},
    },
  },
});

const tableSizeSm = style({ fontSize: vars.typography.size.sm });
const tableSizeMd = style({ fontSize: vars.typography.size.base });
const tableSizeLg = style({ fontSize: vars.typography.size.lg });
globalStyle(`${tableSizeSm} th, ${tableSizeSm} td`, {
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
});
globalStyle(`${tableSizeMd} th, ${tableSizeMd} td`, {
  padding: `${vars.spacing['3']} ${vars.spacing['4']}`,
});
globalStyle(`${tableSizeLg} th, ${tableSizeLg} td`, {
  padding: `${vars.spacing['4']} ${vars.spacing['5']}`,
});

const tableVariantMinimal = style({ border: 'none' });
globalStyle(`${tableVariantMinimal} thead th`, {
  borderBottom: `2px solid ${vars.border.color.primary}`,
});

const tableVariantBordered = style({
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.lg,
  overflow: 'hidden',
});
globalStyle(`${tableVariantBordered} th, ${tableVariantBordered} td`, {
  borderRight: `1px solid ${vars.border.color.primary}`,
});
globalStyle(`${tableVariantBordered} th:last-child, ${tableVariantBordered} td:last-child`, {
  borderRight: 'none',
});
globalStyle(`${tableVariantBordered} tbody tr`, {
  borderBottom: `1px solid ${vars.border.color.primary}`,
});
globalStyle(`${tableVariantBordered} tbody tr:last-child`, { borderBottom: 'none' });

export const styledTable = recipe({
  base: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: vars.typography.family.sans,
    background: vars.background.secondary,
  },
  variants: {
    size: {
      sm: tableSizeSm,
      md: tableSizeMd,
      lg: tableSizeLg,
    },
    variant: {
      default: {
        border: `1px solid ${vars.border.color.primary}`,
        borderRadius: vars.border.radius.lg,
        overflow: 'hidden',
      },
      minimal: tableVariantMinimal,
      bordered: tableVariantBordered,
    },
  },
});

export const tableHead = recipe({
  base: {},
  variants: {
    sticky: {
      true: {
        position: 'sticky',
        top: 0,
        zIndex: vars.zIndex.sticky,
        background: vars.background.secondary,
      },
      false: {},
    },
  },
});

export const tableRow = recipe({
  base: {
    transition: vars.transitions.fast,
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
  variants: {
    hoverable: {
      true: {
        selectors: {
          '&:hover': {
            background: vars.background.tertiary,
          },
        },
      },
      false: {},
    },
    clickable: {
      true: {
        cursor: 'pointer',
      },
      false: {},
    },
    striped: {
      true: {},
      false: {},
    },
  },
});

// Striped rows use a separate style applied by JS based on index parity
export const stripedRow = style({
  background: vars.colors.neutral['100'],
});

export const tableHeaderCell = recipe({
  base: {
    fontWeight: vars.typography.weight.semibold,
    color: vars.text.primary,
    background: vars.background.secondary,
    userSelect: 'none',
    position: 'relative',
    whiteSpace: 'nowrap',
    borderBottom: `1px solid ${vars.border.color.primary}`,
    transition: vars.transitions.fast,
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
  variants: {
    sortable: {
      true: {
        cursor: 'pointer',
        selectors: {
          '&:hover': {
            background: vars.background.tertiary,
          },
          '&:focus-visible': {
            outline: 'none',
            background: vars.background.tertiary,
            boxShadow: `inset 0 0 0 2px ${vars.colors.primary['500']}`,
          },
        },
      },
      false: {
        cursor: 'default',
      },
    },
    align: {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
    },
  },
});

export const sortIconBase = style({
  marginLeft: vars.spacing['1.5'],
  transition: `opacity ${vars.transitions.fast}`,
  fontSize: vars.typography.size.sm,
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

export const sortIconVariants = styleVariants({
  active: { opacity: 1 },
  inactive: { opacity: 0.3 },
});

export const tableCell = recipe({
  base: {
    color: vars.text.secondary,
    verticalAlign: 'top',
    wordWrap: 'break-word',
    lineHeight: vars.typography.lineHeight.relaxed,
  },
  variants: {
    align: {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
    },
  },
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${vars.spacing['12']} ${vars.spacing['6']}`,
  color: vars.text.tertiary,
  textAlign: 'center',
});

export const loadingRowTd = style({
  padding: vars.spacing['4'],
  background: vars.background.tertiary,
  animationName: pulse,
  animationDuration: '1.5s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animationName: 'none',
      opacity: 0.7,
    },
  },
});
