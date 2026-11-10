import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  background: 'white',
  borderRadius: vars.border.radius.lg,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
});

export const header = style({
  padding: vars.spacing['4'],
  borderBottom: '1px solid #e9ecef',
  background: '#f8f9fa',
});

globalStyle(`${header} h3`, {
  margin: `0 0 ${vars.spacing['2']} 0`,
  color: '#333',
  fontWeight: vars.typography.weight.semibold,
  fontSize: '1.1rem',
});

globalStyle(`${header} p`, {
  margin: '0',
  color: '#666',
  fontSize: '0.9rem',
});

export const invitationsList = style({
  padding: vars.spacing['3'],
});

export const invitationCard = recipe({
  base: {
    padding: '1.25rem',
    borderRadius: vars.border.radius.base,
    marginBottom: vars.spacing['3'],
    transition: 'all 0.2s ease',
    selectors: {
      '&:last-child': {
        marginBottom: '0',
      },
      '&:hover': {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  variants: {
    isExpiring: {
      true: {
        border: '2px solid #ffc107',
        background: '#fff3cd',
      },
      false: {
        border: '2px solid #e9ecef',
        background: 'white',
      },
    },
  },
  defaultVariants: {
    isExpiring: false,
  },
});

export const invitationHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '0.75rem',
  gap: vars.spacing['3'],
  '@media': {
    '(max-width: 640px)': {
      flexDirection: 'column',
    },
  },
});

export const invitationInfo = style({
  flex: 1,
});

export const email = style({
  fontWeight: vars.typography.weight.semibold,
  color: '#333',
  fontSize: vars.typography.size.base,
  marginBottom: vars.spacing['1'],
  wordBreak: 'break-all',
});

export const title = style({
  color: '#666',
  fontSize: '0.9rem',
  marginBottom: vars.spacing['2'],
});

export const metaInfo = style({
  display: 'flex',
  gap: vars.spacing['3'],
  flexWrap: 'wrap',
  marginTop: vars.spacing['2'],
});

export const metaItem = style({
  color: '#666',
  fontSize: '0.85rem',
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['1'],
});

globalStyle(`${metaItem} strong`, {
  color: '#333',
});

export const actions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  alignItems: 'flex-start',
  '@media': {
    '(max-width: 640px)': {
      width: '100%',
      justifyContent: 'flex-end',
    },
  },
});

export const emptyState = style({
  padding: `${vars.spacing['6']} ${vars.spacing['5']}`,
  textAlign: 'center',
  color: '#666',
});

export const emptyIcon = style({
  fontSize: vars.typography.size['5xl'],
  marginBottom: vars.spacing['3'],
});

export const emptyText = style({
  fontSize: '1.1rem',
  color: '#666',
});

globalStyle(`${emptyText} p`, {
  margin: `${vars.spacing['2']} 0`,
});

export const loadingContainer = style({
  padding: `${vars.spacing['6']} ${vars.spacing['5']}`,
  textAlign: 'center',
  color: '#666',
});
