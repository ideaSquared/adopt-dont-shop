import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  background: 'white',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
});

export const header = style({
  padding: '1.5rem',
  borderBottom: '1px solid #e9ecef',
  background: '#f8f9fa',
});

globalStyle(`${header} h3`, {
  margin: '0 0 0.5rem 0',
  color: '#333',
  fontWeight: '600',
  fontSize: '1.1rem',
});

globalStyle(`${header} p`, {
  margin: '0',
  color: '#666',
  fontSize: '0.9rem',
});

export const invitationsList = style({
  padding: '1rem',
});

export const invitationCard = recipe({
  base: {
    padding: '1.25rem',
    borderRadius: '8px',
    marginBottom: '1rem',
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
  gap: '1rem',
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
  fontWeight: '600',
  color: '#333',
  fontSize: '1rem',
  marginBottom: '0.25rem',
  wordBreak: 'break-all',
});

export const title = style({
  color: '#666',
  fontSize: '0.9rem',
  marginBottom: '0.5rem',
});

export const metaInfo = style({
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  marginTop: '0.5rem',
});

export const metaItem = style({
  color: '#666',
  fontSize: '0.85rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
});

globalStyle(`${metaItem} strong`, {
  color: '#333',
});

export const actions = style({
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  '@media': {
    '(max-width: 640px)': {
      width: '100%',
      justifyContent: 'flex-end',
    },
  },
});

export const emptyState = style({
  padding: '3rem 2rem',
  textAlign: 'center',
  color: '#666',
});

export const emptyIcon = style({
  fontSize: '3rem',
  marginBottom: '1rem',
});

export const emptyText = style({
  fontSize: '1.1rem',
  color: '#666',
});

globalStyle(`${emptyText} p`, {
  margin: '0.5rem 0',
});

export const loadingContainer = style({
  padding: '3rem 2rem',
  textAlign: 'center',
  color: '#666',
});
