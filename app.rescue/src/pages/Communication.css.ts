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
