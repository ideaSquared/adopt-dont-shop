import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: '#ffffff',
});

export const pageHeader = style({
  padding: '1.5rem 2rem',
  background: '#ffffff',
  borderBottom: '1px solid #e5e7eb',
  '@media': {
    'screen and (max-width: 768px)': {
      padding: '1rem 1.25rem',
    },
  },
});

globalStyle(`${pageHeader} h1`, {
  margin: 0,
  fontSize: '1.875rem',
  fontWeight: 700,
  color: '#111827',
  letterSpacing: '-0.025em',
});

globalStyle(`${pageHeader} p`, {
  margin: '0.5rem 0 0 0',
  color: '#6b7280',
  fontSize: '1rem',
});

export const chatContainer = style({
  flex: 1,
  display: 'grid',
  gridTemplateColumns: '350px 1fr',
  overflow: 'hidden',
  minHeight: 0,
  '@media': {
    'screen and (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const mobileView = style({
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'grid',
      gridTemplateColumns: '1fr',
      height: '100%',
    },
  },
});

export const mobileViewShowChat = style({});

globalStyle(`${mobileViewShowChat} > :first-child`, {
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'none',
    },
  },
});

globalStyle(`${mobileViewShowChat} > :last-child`, {
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'flex',
    },
  },
});

export const mobileViewHideChat = style({});

globalStyle(`${mobileViewHideChat} > :first-child`, {
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'flex',
    },
  },
});

globalStyle(`${mobileViewHideChat} > :last-child`, {
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'none',
    },
  },
});

export const toolbar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginTop: '1rem',
  flexWrap: 'wrap',
});

export const filterTab = style({
  padding: '0.375rem 0.875rem',
  borderRadius: '9999px',
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#374151',
  fontWeight: 500,
  fontSize: '0.875rem',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: '#f3f4f6',
    },
  },
});

export const filterTabActive = style({
  background: '#2563eb',
  borderColor: '#2563eb',
  color: '#ffffff',
  selectors: {
    '&:hover': {
      background: '#1d4ed8',
    },
  },
});

export const actionGroup = style({
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});
